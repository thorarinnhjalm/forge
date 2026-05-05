import { GoogleGenAI } from "@google/genai";

// Use the Gemini API key from env, or fall back to Vertex AI service account auth
const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error("GEMINI_API_KEY is not set. Get one from https://aistudio.google.com/apikey");
  }
  return new GoogleGenAI({ apiKey });
};

export const MODELS = {
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-2.5-pro'
};

export const generateJson = async (prompt: string, systemInstruction?: string, modelType: string = MODELS.PRO) => {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: modelType,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      systemInstruction: systemInstruction || undefined,
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse JSON from Gemini", e);
    return null;
  }
};

export const generateText = async (prompt: string, systemInstruction?: string, modelType: string = MODELS.FLASH) => {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: modelType,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || undefined,
    },
  });

  return response.text || "";
};
