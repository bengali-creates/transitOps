import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssistantIntent, AssistantIntentSchema } from "./intents";

export async function classifyIntent(userMessage: string): Promise<AssistantIntent> {
  // const apiKey = process.env.GEMINI_API_KEY;
  // if (!apiKey) {
  //   console.error("GEMINI_API_KEY is not set.");
  //   return { intent: "UNKNOWN", slots: {} };
  // }

  const ai = new GoogleGenAI({});

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      intent: {
        type: Type.STRING,
        description: "The classified intent from the user message. Must be one of: LICENCE_EXPIRY, FLEET_UTILIZATION, HIGH_COST_VEHICLE, DRIVER_SAFETY, VEHICLE_STATUS, UNKNOWN.",
      },
      slots: {
        type: Type.OBJECT,
        description: "Parameters extracted from the user message. E.g., 'within_days' for LICENCE_EXPIRY, 'period' for FLEET_UTILIZATION.",
      },
    },
    required: ["intent", "slots"],
  };

  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: `You are a fleet operations assistant intent classifier. Classify the following user message into a specific intent and extract slots. If the message is irrelevant or unclear, use the UNKNOWN intent. Message: "${userMessage}"`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: schema,
      },
    });

    const text = interaction.output_text;
    if (!text) return { intent: "UNKNOWN", slots: {} };
    
    const parsed = JSON.parse(text);
    
    // Use Zod to validate and type-check the output
    const result = AssistantIntentSchema.safeParse(parsed);
    
    if (result.success) {
      return result.data;
    } else {
      console.warn("Intent classification parsing error:", result.error);
      return { intent: "UNKNOWN", slots: {} };
    }
  } catch (error) {
    console.error("Error classifying intent:", error);
    return { intent: "UNKNOWN", slots: {} };
  }
}
