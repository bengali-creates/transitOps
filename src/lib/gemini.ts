import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work correctly.");
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function askGemini(prompt: string, schema?: any) {
  try {
    const config: any = {};
    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config,
    });
    
    if (schema) {
      return JSON.parse(response.text || "{}");
    }
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
