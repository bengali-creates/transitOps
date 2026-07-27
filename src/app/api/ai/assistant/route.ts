import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { classifyIntent } from "@/lib/assistant/classifier";
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

export async function POST(req: Request) {
  try {
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
    const { intent, slots } = await classifyIntent(lastMessage.content);

    const intentRoleMap: Record<string, Role[]> = {
      LICENCE_EXPIRY: ["fleet_manager", "safety_officer", "admin"],
      FLEET_UTILIZATION: ["fleet_manager", "financial_analyst", "admin"],
      HIGH_COST_VEHICLE: ["fleet_manager", "financial_analyst", "admin"],
      DRIVER_SAFETY: ["fleet_manager", "safety_officer", "admin"],
      VEHICLE_STATUS: ["fleet_manager", "financial_analyst", "admin"],
    };

    const allowedRoles = intentRoleMap[intent];
    if (allowedRoles && !allowedRoles.includes(role)) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ 
                type: "text", 
                content: `Access Denied: Your role (${role.replace("_", " ")}) is not authorized to query this information.` 
              }) + "\n"
            )
          );
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
        },
      });
    }

    let dataContext = null;
    let actionPills: any[] = [];

    switch (intent) {
      case "LICENCE_EXPIRY": {
        const days = slots.within_days || 30;
        dataContext = await fetchLicenceExpiries(days);
        actionPills = dataContext.map((d: any) => ({
          label: `View Driver: ${d.name}`,
          actionType: "viewDriver",
          payload: { driverId: d.id },
        }));
        break;
      }
      case "FLEET_UTILIZATION": {
        dataContext = await fetchFleetUtilization(slots.period || "today");
        actionPills = [
          { label: "View Fleet Map", actionType: "viewMap", payload: {} }
        ];
        break;
      }
      case "HIGH_COST_VEHICLE": {
        dataContext = await fetchHighCostVehicles(slots.top_n || 5, slots.cost_type || "total");
        break;
      }
      case "DRIVER_SAFETY": {
        dataContext = await fetchDriverSafetyRanking(slots.threshold, slots.order || "asc");
        break;
      }
      case "VEHICLE_STATUS": {
        dataContext = await fetchVehicleStatus(slots.status);
        break;
      }
      case "UNKNOWN":
        break;
      default:
        break;
    }
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
      intent,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...existingMessages, formattedUserMsg];

    if (!activeConversationId) {
      const title = lastMessage.content.slice(0, 40) + (lastMessage.content.length > 40 ? "..." : "");
      const [newConv] = await db
        .insert(conversations)
        .values({
          userId: session.user.id,
          title,
          messages: updatedMessages,
        })
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

    const systemPrompt = `You are a fleet operations analyst.
Answer the user's question ONLY using the provided Data Context.
If the data context is empty or null, politely clarify that you can only answer questions about fleet operations based on available data, and ask the user to rephrase.
Do not invent any names, numbers, or statuses.

Data Context:
${dataContext ? JSON.stringify(dataContext, null, 2) : "None"}`;

    const chatHistory = messages.map((m: any) => ({
      type: (m.role === "assistant" ? "model_output" : "user_input") as "model_output" | "user_input",
      content: [{ type: "text" as const, text: m.content }],
    }));

    const responseStream = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: chatHistory,
      stream: true,
      system_instruction: systemPrompt,
      generation_config: {
        temperature: 0.1,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ type: "meta", conversationId: activeConversationId }) + "\n"
            )
          );

          let assistantText = "";
          for await (const event of responseStream) {
            if (
              event.event_type === "step.delta" &&
              event.delta?.type === "text" &&
              event.delta.text
            ) {
              const chunkText = event.delta.text;
              assistantText += chunkText;
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ type: "text", content: chunkText }) + "\n"
                )
              );
            }
          }

          // Send actions at the end
          if (actionPills.length > 0) {
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({ type: "actions", actions: actionPills.slice(0, 3) }) + "\n"
              )
            );
          }

          // Save final assistant message to DB
          const formattedAssistantMsg = {
            role: "assistant",
            content: assistantText,
            actions: actionPills.slice(0, 3),
            timestamp: new Date().toISOString(),
          };

          await db
            .update(conversations)
            .set({ messages: [...updatedMessages, formattedAssistantMsg] })
            .where(eq(conversations.id, activeConversationId));

          controller.close();
        } catch (error) {
          console.error("Streaming error in controller:", error);
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
