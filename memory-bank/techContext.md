# Tech Context: Vertex Search MCP Server

## Technologies Used
*   **Language**: **TypeScript** (v5.8) for type-safe development.
*   **Runtime**: **Node.js** (v22+) for execution.
*   **MCP SDK**: **modelcontextprotocol/sdk** (v1.26.0) for server implementation.
*   **AI SDK**: **@google/genai** (v1.41.0) and **google-auth-library** (v10.5.0) for Vertex AI access.
*   **Validation**: **zod** for schema validation.
*   **Configuration**: **dotenv** for environment variables.

## Development Setup
1.  **Dependencies**: Install with `npm install`.
2.  **Environment**: Requires `.env` with:
    *   `GOOGLE_CLOUD_PROJECT`: GCP Project ID.
    *   `GOOGLE_CLOUD_LOCATION`: Region (e.g., `us-central1`).
    *   `GOOGLE_APPLICATION_CREDENTIALS`: Path to JSON key file.
    *   `GEMINI_MODEL`: (Optional) The Gemini model to use.
    *   `MODEL_SYSTEM_INSTRUCTION`: (Optional) Custom system instructions.
    *   `PORT`: (Optional) Run as HTTP server instead of stdio.
    *   `MAX_OUTPUT_TOKENS`: (Optional) Max output tokens (default: `30090`).
    *   `TEMPERATURE`: (Optional) Sampling temperature (default: `1`).
    *   `TOP_P`: (Optional) Top-P sampling (default: `0.95`).
    *   `MAX_RETRIES`: (Optional) Max retry attempts on rate-limit/outage errors (default: `3`).
3.  **Build**: `npm run build` compiles TypeScript to `dist/`.
4.  **Run**: `npm run start` launches the server.

## Project Structure
*   `src/index.ts`: Main entry point and server logic.
*   `src/config/env.ts`: Centralized environment loader and validator.
*   `src/ai/vertex.ts`: Gemini integration and search execution.
*   `src/utils/logger.ts`: Winston logger configuration.
*   `dist/`: Compiled JavaScript output.
*   `.env`: Local environment configuration (gitignored).
*   `.env.example`: Template for environment variables.
