import { AgentRuntime } from "move-agent-kit";
import { GeminiCreateImageTool } from "../tools/gemini/create-image";
import { createImageWithGemini } from "../tools/gemini/create-image-impl";
import { AptosAccount, Ed25519PrivateKey, Network, PrivateKey, PrivateKeyVariants } from "@aptos-labs/ts-sdk";
import { ChatAnthropic } from "@langchain/anthropic";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Message } from "ai/types"; // Fixed import for Message type
import { LocalSigner, createAptosTools } from "move-agent-kit";
import { NextResponse } from "next/server"; // Added type import

// Initialize both AI models
const anthropicLLM = new ChatAnthropic({
  temperature: 0.7,
  model: "claude-3-5-sonnet-latest",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Custom AgentRuntime extension to include Gemini
class ExtendedAgentRuntime extends AgentRuntime {
  private geminiModel;

  constructor(signer: LocalSigner, aptos: AptosAccount, config: any) {
    super(signer, aptos, config);
    this.geminiModel = geminiAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async generateWithGemini(prompt: string) {
    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }
}

// Create custom tools including Gemini capabilities
const createExtendedTools = (agent: ExtendedAgentRuntime) => {
  const baseTools = createAptosTools(agent);

  const geminiTool = {
    name: "generate_with_gemini",
    description: "Generate content using Google's Gemini AI model",
    func: async (input: string) => {
      return await agent.generateWithGemini(input);
    },
  };

  return [...baseTools, geminiTool];
};

const textDecoder = new TextDecoder();

// Stream reading function (unchanged)
async function readStream(stream: any) {
  try {
    const reader = stream.getReader();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += textDecoder.decode(value, { stream: true });
    }
    result += textDecoder.decode();
    return result;
  } catch (error) {
    console.error("Error reading stream:", error);
    throw error;
  }
}
// Message conversion functions (unchanged)
const convertVercelMessageToLangChainMessage = (message: { role: string; content: string }) => {
  if (message.role === "user") {
    return new HumanMessage(message.content);
  } else if (message.role === "assistant") {
    return new AIMessage(message.content);
  } else {
    return new ChatMessage(message.content, message.role);
  }
};

const convertLangChainMessageToVercelMessage = (message: BaseMessage) => {
  if (message._getType() === "human") {
    return { content: message.content, role: "user" };
  } else if (message._getType() === "ai") {
    return {
      content: message.content,
      role: "assistant",
      tool_calls: (message as AIMessage).tool_calls,
    };
  } else {
    return { content: message.content, role: message._getType() };
  }
};

export async function POST(request: Request) {
  try {
    // Initialize Aptos configuration
    const aptosConfig = new AptosAccount({
      network: Network.MAINNET,
    });

    const aptos = new AptosAccount(aptosConfig);

    // Validate private key
    const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyStr) {
      throw new Error("Missing APTOS_PRIVATE_KEY environment variable");
    }

    // Setup account and signer
    const account = await aptos.deriveAccountFromPrivateKey({
      privateKey: new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(privateKeyStr, PrivateKeyVariants.Ed25519)
      ),
    });

    const signer = new LocalSigner(account, Network.MAINNET);

    // Initialize extended agent with both Anthropic and Gemini support
    const extendedAgent = new ExtendedAgentRuntime(signer, aptos, {
      PANORA_API_KEY: process.env.PANORA_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    });

    const tools = createExtendedTools(extendedAgent);
    const memory = new MemorySaver();

    // Create React agent with updated message modifier
    const agent = createReactAgent({
      llm: anthropicLLM, // Using Anthropic as primary LLM
      tools: tools as any, // Type assertion to fix type error
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Aptos Agent Kit and multiple AI models.
        - Use Claude (default) for general interactions and complex reasoning
        - Use Gemini for specific tasks that benefit from its capabilities
        
        You can interact onchain using your tools. If you need funds, request them from the
        faucet or ask the user. Handle 5XX errors by asking users to try again later. If a requested
        task isn't possible with current tools, direct users to https://www.aptosagentkit.xyz.
        Be concise and helpful. Only restate tool descriptions when explicitly asked.

        The response also contains token/token[] which contains the name and address of the token and the decimals.
        WHEN YOU RETURN ANY TOKEN AMOUNTS, RETURN THEM ACCORDING TO THE DECIMALS OF THE TOKEN.
      `,
    });

    // Rest of the implementation remains the same
    const body = await request.json();
    const messages = body.messages ?? [];
    const showIntermediateSteps = body.show_intermediate_steps ?? false;

    if (!showIntermediateSteps) {
      const eventStream = await agent.streamEvents(
        { messages },
        {
          version: "v2",
          configurable: {
            thread_id: "Aptos Agent Kit!",
          },
        }
      );

      const textEncoder = new TextEncoder();
      const transformStream = new ReadableStream({
        async start(controller) {
          for await (const { event, data } of eventStream) {
            if (event === "on_chat_model_stream") {
              if (data.chunk.content) {
                if (typeof data.chunk.content === "string") {
                  controller.enqueue(textEncoder.encode(data.chunk.content));
                } else {
                  for (const content of data.chunk.content) {
                    controller.enqueue(
                      textEncoder.encode(content.text ? content.text : "")
                    );
                  }
                }
              }
            }
          }
          controller.close();
        },
      });

      return new Response(transformStream);
    } else {
      const result = await agent.invoke({ messages });
      return NextResponse.json(
        {
          messages: result.messages.map(convertLangChainMessageToVercelMessage),
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Request error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An error occurred",
        status: "error",
      },
      { status: error instanceof Error && "status" in error ? 500 : 500 }
    );
  }
}

// Example usage component
import React, { useEffect, useState } from "react";

interface CustomMoveAgentProps {
  createImageWithGemini: (
    arg0: string,
    arg1: string,
    imageUrl: string
  ) => unknown;
  account: AptosAccount;
  network?: Network;
}

export const CustomMoveAgentProvider: React.FC<CustomMoveAgentProps> = ({
  account,
  network = Network.MAINNET,
  children,
}) => {
  const [agent, setAgent] = useState<CustomMoveAgentProps | null>(null);

  useEffect(() => {
    const newAgent = new useCustomMoveAgent(account, network, {
      // Add any additional configuration here
    });
    setAgent(newAgent);
  }, [account, network]);

  if (!agent) {
    return <div>Loading agent...</div>;
  }

  return <div>{children}</div>;
};

// Hook for using the custom agent
export const useCustomMoveAgent = () => {
  const [agent] = useState<CustomMoveAgentProps | null>(null);

  if (!agent) {
    throw new Error(
      "CustomMoveAgent must be used within CustomMoveAgentProvider"
    );
  }

  return agent;
};

// Example usage of the custom agent with Gemini
export const GeminiImageAnalysis: React.FC = () => {
  const agent = useCustomMoveAgent();
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const analyzeImage = async (imageUrl: string) => {
    try {
      const response = await agent.createImageWithGemini(
        "Describe this image in detail",
        "analyze",
        imageUrl
      );
      const typedResponse = response as { text: string };
      setResult(typedResponse.text);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Gemini Image Analysis</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {result && <div>{result}</div>}
      <button onClick={() => analyzeImage("https://example.com/image.jpg")}>
        Analyze Image
      </button>
    </div>
  );
};
