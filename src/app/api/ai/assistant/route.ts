import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getAuthorizedTools } from "@/lib/assistant/tools";
import {
  fetchDriverSafetyRanking,
  fetchFleetUtilization,
  fetchHighCostVehicles,
  fetchLicenceExpiries,
  fetchVehicleStatus,
} from "@/lib/assistant/fetchers";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can, type Role } from "@/lib/rbac";

/** Execute a tool call by mapping its name to the correct fetcher */
async function executeTool(name: string, args: Record<string, any>) {
  switch (name) {
    case "fetchLicenceExpiries":
      return fetchLicenceExpiries(args.within_days ?? 30);
    case "fetchFleetUtilization":
      return fetchFleetUtilization(args.period ?? "today");
    case "fetchHighCostVehicles":
      return fetchHighCostVehicles(args.top_n ?? 5, args.cost_type ?? "total");
    case "fetchDriverSafetyRanking":
      return fetchDriverSafetyRanking(args.threshold, args.order ?? "asc");
    case "fetchVehicleStatus":
      return fetchVehicleStatus(args.status);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: Request) {
  try {
    // 1. Auth + RBAC gate
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role as Role;
    if (!can(role, "ai:use")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];

    // 2. Get only the tools this role is authorized to use
    const authorizedTools = getAuthorizedTools(role);
    const toolsForGemini = authorizedTools.map(({ type, name, description, parameters }) => ({
      type,
      name,
      description,
      parameters,
    }));

    let activeConversationId = conversationId;
    let existingMessages: any[] = [];

    if (activeConversationId) {
      const conv = await db.query.conversations.findFirst({
        where: eq(conversations.id, activeConversationId),
      });
      if (conv) {
        existingMessages = conv.messages as any[];
      } else {
        activeConversationId = null;
      }
    }

    const formattedUserMsg = {
      role: "user",
      content: lastMessage.content,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...existingMessages, formattedUserMsg];

    if (!activeConversationId) {
      const title = lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "");
      const [newConv] = await db
        .insert(conversations)
        .values({ userId: session.user.id, title, messages: updatedMessages })
        .returning();
      activeConversationId = newConv.id;
    } else {
      await db
        .update(conversations)
        .set({ messages: updatedMessages })
        .where(eq(conversations.id, activeConversationId));
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are a fleet operations co-pilot assistant for a transit operations platform.
Answer questions about the fleet by calling the available tools to fetch live data.
Only use the data returned by tool calls — never invent numbers, names, or registrations.
If the user asks something outside of fleet operations, politely decline.
If no tool is relevant, say you don't have enough data to answer.`;

    const chatHistory = messages.map((m: any) => ({
      type: (m.role === "assistant" ? "model_output" : "user_input") as "model_output" | "user_input",
      content: [{ type: "text" as const, text: m.content }],
    }));

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ type: "meta", conversationId: activeConversationId }) + "\n"
            )
          );

          let finalText = "";
          let actionPills: any[] = [];

          let interactionInput: Array<{
            type: "user_input" | "model_output" | "function_result";
            content?: Array<{ type: "text"; text: string }>;
            name?: string;
            call_id?: string;
            result?: Array<{ type: "text"; text: string }>;
          }> = [...chatHistory];

          while (true) {
            const response = await (ai.interactions as any).create({
              model: "gemini-3.5-flash",
              input: interactionInput,
              system_instruction: systemInstruction,
              tools: toolsForGemini,
              generation_config: { temperature: 0.1 },
            });

            const functionCallSteps: any[] = (response.steps ?? []).filter(
              (step: any) => step.type === "function_call"
            );

            if (functionCallSteps.length === 0) {
              
              const outputText: string = response.output_text ?? "";
              finalText += outputText;

              const words = outputText.split(" ");
              for (let i = 0; i < words.length; i += 5) {
                const chunk =
                  words.slice(i, i + 5).join(" ") +
                  (i + 5 < words.length ? " " : "");
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({ type: "text", content: chunk }) + "\n"
                  )
                );
              }
              break;
            }

            for (const step of functionCallSteps) {
              const toolName: string = step.name;
              const toolArgs: Record<string, any> = step.arguments ?? {};
              const result = await executeTool(toolName, toolArgs);

              if (toolName === "fetchLicenceExpiries" && Array.isArray(result)) {
                actionPills.push(
                  ...result.slice(0, 2).map((d: any) => ({
                    label: `View Driver: ${d.name}`,
                    actionType: "viewDriver",
                    payload: { driverId: d.id },
                  }))
                );
              }

              // Append the function result back into the conversation
              interactionInput.push({
                type: "function_result",
                name: toolName,
                call_id: step.id,
                result: [{ type: "text" as const, text: JSON.stringify(result) }],
              });
            }
          }

          // Send action pills
          if (actionPills.length > 0) {
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({ type: "actions", actions: actionPills.slice(0, 3) }) + "\n"
              )
            );
          }

          // Persist final assistant message to DB
          const formattedAssistantMsg = {
            role: "assistant",
            content: finalText,
            actions: actionPills.slice(0, 3),
            timestamp: new Date().toISOString(),
          };
          await db
            .update(conversations)
            .set({ messages: [...updatedMessages, formattedAssistantMsg] })
            .where(eq(conversations.id, activeConversationId));

          controller.close();
        } catch (error) {
          console.error("Co-pilot streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Assistant Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
