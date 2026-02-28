import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  ThinkingLevel,
  type GenerateContentConfig,
} from "@google/genai";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

const ai = new GoogleGenAI({
  vertexai: true,
  project: config.projectId,
  location: config.location,
});

const generationConfig: GenerateContentConfig = {
  maxOutputTokens: config.maxOutputTokens,
  temperature: config.temperature,
  topP: config.topP,
  thinkingConfig: {
    thinkingLevel: ThinkingLevel.HIGH,
  },
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
  ],
  tools: [{ googleSearch: {} }],
  systemInstruction: {
    parts: [{ text: config.systemInstruction }],
  },
};

export interface SearchOptions {
  query: string;
  site_filter?: string;
  time_range?: string;
}

export async function performSearch(options: SearchOptions, requestId: string) {
  // Create a fresh chat per request to prevent history leaking between queries
  const chat = ai.chats.create({
    model: config.model,
    config: generationConfig,
  });
  const startTime = Date.now();

  let finalQuery = options.query;
  if (options.site_filter) {
    finalQuery += ` site:${options.site_filter}`;
  }
  if (options.time_range) {
    finalQuery += ` (Important instruction: Only use information from the ${options.time_range})`;
  }

  logger.info(`[${requestId}] Request: ${finalQuery}`);

  let attempt = 0;
  const maxRetries = config.maxRetries;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.info(`[${requestId}] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await chat.sendMessageStream({
        message: [{ text: finalQuery }],
      });

      let fullText = "";
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
        }
      }

      if (!fullText) {
        logger.warn(`[${requestId}] Empty response from model`);
        return {
          content: [
            {
              type: "text" as const,
              text: "The model returned an empty response. Try rephrasing your query.",
            },
          ],
        };
      }

      const duration = Date.now() - startTime;
      logger.info(`[${requestId}] Success (${duration}ms)`);
      return {
        content: [{ type: "text" as const, text: fullText }],
      };
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.status === 429 || // Too Many Requests
        error.status === 503 || // Service Unavailable
        (error.message && (error.message.includes("429") || error.message.includes("503")));

      if (isRetryable && attempt < maxRetries) {
        attempt++;
        logger.warn(`[${requestId}] Retryable error: ${error.message} (status: ${error.status})`);
        continue;
      }

      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      logger.error(`[${requestId}] Critical Error (${duration}ms): ${message}`, stack);

      // Handle specific safety blocks or other known errors gracefully
      if (message.includes("SAFETY") || message.includes("blocked")) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "Query rejected by Vertex AI safety filters: Please try rephrasing."
        );
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Vertex AI query failed: ${message}`
      );
    }
  }

  // Exhausted all retries
  const finalMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new McpError(
    ErrorCode.InternalError,
    `Max retries exceeded communicating with Vertex AI. Last error: ${finalMessage}`
  );
}
