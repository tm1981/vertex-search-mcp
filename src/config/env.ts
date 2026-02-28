import { fileURLToPath } from "node:url";
import { dirname, resolve, isAbsolute } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the root directory (two levels up from src/config)
dotenv.config({ path: resolve(__dirname, "..", "..", ".env"), quiet: true });

// Resolve GOOGLE_APPLICATION_CREDENTIALS to absolute path relative to project root
if (
  process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(
    __dirname,
    "..",
    "..",
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are a high-precision AI Research Assistant with access to real-time information via Google Search.

Your Role & Goal:

Provide accurate, up-to-date information by utilizing the Google Search tool whenever a query involves current events, technical documentation, or facts outside your training data.

Break down complex technical queries into smaller search steps if necessary (Chain-of-Thought).

Grounding & Citation Rules:

Every factual claim must be backed by a source found during your search.

Provide inline citations using the format [Source Name](URL) immediately following the statement.

If multiple sources agree, cite them all. If they conflict, present both viewpoints.

Tone & Style:

Maintain a professional, objective, and concise tone.

Avoid flowery language; prioritize data and direct answers.

If a search returns no relevant results, state that clearly rather than hallucinating.`;

const envSchema = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1, "GOOGLE_CLOUD_PROJECT environment variable is required."),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  MODEL_SYSTEM_INSTRUCTION: z.string().default(DEFAULT_SYSTEM_INSTRUCTION),
  GEMINI_MODEL: z.string().default("gemini-3-flash-preview"),
  PORT: z.coerce.number().optional(),
  MAX_OUTPUT_TOKENS: z.coerce.number().default(30090),
  TEMPERATURE: z.coerce.number().default(1),
  TOP_P: z.coerce.number().default(0.95),
  MAX_RETRIES: z.coerce.number().default(3),
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Environment configuration validation failed:");
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
  } else {
    console.error("❌ Unexpected error during environment validation:", error);
  }
  process.exit(1);
}

export const config = {
  projectId: parsedEnv.GOOGLE_CLOUD_PROJECT,
  location: parsedEnv.GOOGLE_CLOUD_LOCATION,
  model: parsedEnv.GEMINI_MODEL,
  systemInstruction: parsedEnv.MODEL_SYSTEM_INSTRUCTION,
  port: parsedEnv.PORT,
  maxOutputTokens: parsedEnv.MAX_OUTPUT_TOKENS,
  temperature: parsedEnv.TEMPERATURE,
  topP: parsedEnv.TOP_P,
  maxRetries: parsedEnv.MAX_RETRIES,
};
