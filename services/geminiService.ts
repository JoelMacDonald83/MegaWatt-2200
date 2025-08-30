
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";

// Ensure the API key is available from environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  const errorMessage = "API_KEY environment variable not set. Please check your configuration.";
  debugService.log("CRITICAL: Gemini Service Initialization Failed", { error: errorMessage });
  throw new Error(errorMessage);
}

const ai = new GoogleGenAI({ apiKey });

export const generateStoryContent = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.8,
            topP: 0.95,
        }
    });
    return response.text;
  } catch (error) {
    debugService.log("Gemini API Error (generateStoryContent)", { error });
    // Re-throw a user-friendly error to be handled by the caller
    throw new Error("Failed to generate story content. The AI service may be unavailable or experiencing issues.");
  }
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    if (base64ImageBytes) {
        return base64ImageBytes;
    }
    // This case is unlikely but good to have
    const noImageError = new Error("API did not return an image despite a successful response.");
    debugService.log("Gemini API Warning (generateImageFromPrompt)", { error: noImageError });
    throw noImageError;

  } catch (error) {
    debugService.log("Gemini API Error (generateImageFromPrompt)", { error });
    // Re-throw a user-friendly error
    throw new Error("Failed to generate image. The AI service may be unavailable or the prompt may have been blocked.");
  }
};
