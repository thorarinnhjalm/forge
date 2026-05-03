import { VertexAI } from "@google-cloud/vertexai";

const getVertexClient = () => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "demo-project";
  const location = 'europe-west1'; 
  return new VertexAI({ project: projectId, location });
};

export const MODELS = {
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-2.5-pro'
};

export const generateJson = async (prompt: string, systemInstruction?: string, modelType: string = MODELS.PRO) => {
  const vertex_ai = getVertexClient();
  const model = vertex_ai.preview.getGenerativeModel({
    model: modelType,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }], role: 'system' } : undefined
  });

  const request = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ]
  };

  const streamingResp = await model.generateContentStream(request);
  const response = await streamingResp.response;
  
  try {
    return JSON.parse(response.candidates?.[0]?.content?.parts[0]?.text || "{}");
  } catch (e) {
    console.error("Failed to parse JSON from Gemini", e);
    return null;
  }
};

export const generateText = async (prompt: string, systemInstruction?: string, modelType: string = MODELS.FLASH) => {
  const vertex_ai = getVertexClient();
  const model = vertex_ai.preview.getGenerativeModel({
    model: modelType,
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }], role: 'system' } : undefined
  });

  const request = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ]
  };

  const response = await model.generateContent(request);
  return response.response.candidates?.[0]?.content?.parts[0]?.text || "";
};
