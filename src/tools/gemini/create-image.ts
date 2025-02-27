import { Tool } from "langchain/tools";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiCreateImageTool extends Tool {
  private agent: any;

  constructor(agent: any) {
    super();
    this.agent = agent;
  }

  name = "gemini_create_image";
  description = `
    Generate content or analyze images using Google's Gemini AI

    Inputs (input is a JSON string):
    prompt: string, Text description or query about the image (required)
    mode: string, Operation mode ('generate' or 'analyze') (default: 'generate')
    imageUrl?: string, URL of image to analyze (required for 'analyze' mode)`;

  async _call(input: string) {
    try {
      const parsedInput = JSON.parse(input);
      const response = await this.agent.createImageWithGemini(
        parsedInput.prompt,
        parsedInput.mode,
        parsedInput.imageUrl
      );
      return JSON.stringify({
        status: "success",
        response,
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
}
