import { GoogleGenerativeAI } from "@google/generative-ai";

export async function createImageWithGemini(
  agent: any,
  prompt: string,
  mode: string = "generate",
  imageUrl?: string
) {
  try {
    const apiKey = agent.config.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("No GEMINI_API_KEY in config");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Select the appropriate model based on the mode
    const model =
      mode === "analyze"
        ? genAI.getGenerativeModel({ model: "gemini-pro-vision" })
        : genAI.getGenerativeModel({ model: "gemini-pro" });

    let response;

    if (mode === "analyze" && imageUrl) {
      // For image analysis
      const imageResponse = await fetch(imageUrl);
      const imageData = await imageResponse.arrayBuffer();

      response = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: Buffer.from(imageData).toString("base64"),
            mimeType: "image/jpeg",
          },
        },
      ]);
    } else {
      // For text-only generation
      response = await model.generateContent(prompt);
    }

    const result = await response.response;
    return {
      text: result.text(),
      // Add any additional response data you want to include
    };
  } catch (error: any) {
    throw new Error(`Gemini operation failed: ${error.message}`);
  }
}
