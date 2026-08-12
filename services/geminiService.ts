
import { GoogleGenAI, Type } from "@google/genai";
import { ComplaintType, ComplaintPriority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface SmartCategorization {
  type: ComplaintType;
  priority: ComplaintPriority;
  summary: string;
}

export const analyzeComplaint = async (description: string): Promise<SmartCategorization> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following civic complaint and categorize it. 
      Description: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { 
              type: Type.STRING, 
              enum: ['garbage', 'streetlight', 'road', 'water', 'other'] 
            },
            priority: { 
              type: Type.STRING, 
              enum: ['low', 'medium', 'high', 'critical'] 
            },
            summary: { type: Type.STRING }
          },
          required: ['type', 'priority', 'summary']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data as SmartCategorization;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      type: 'other',
      priority: 'medium',
      summary: description.substring(0, 50) + '...'
    };
  }
};
