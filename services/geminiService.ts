
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available from environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set");
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
    console.error("Error generating content with Gemini API:", error);
    return "Error: Could not generate content. Please check the console for details.";
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
    throw new Error("API did not return an image.");

  } catch (error) {
    console.error("Error generating image with Gemini API:", error);
    throw new Error("Error: Could not generate image. Please check the console for details.");
  }
};
