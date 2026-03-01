# System Patterns: Vertex Search MCP Server

## Architecture
This project follows a standard MCP server architecture:
1.  **Transport Layer**: `StdioServerTransport` for CLI mode, or `StreamableHTTPServerTransport` (stateful session management, via `createMcpExpressApp` bounded to `0.0.0.0` to disable DNS rebinding protection) for HTTP mode — communicates with MCP clients over standard I/O or the `/mcp` endpoint using HTTP headers for session routing.
2.  **Server Implementation**: `McpServer` - Defines the tools and handles incoming requests.
3.  **Core Logic**: `vertex_search` tool - Integrated with Google Vertex AI SDK.
4.  **External Service**: Google Vertex AI (Gemini Models) + Google Search Grounding.

## Design Patterns

### Tool-Based Interaction
The server exposes a single tool (`vertex_search`) rather than complex resources or prompts. This keeps the interface simple and focused on query execution.

### Grounded Generation
The core pattern is **Retrieval Augmented Generation (RAG)**, specifically utilizing Google's proprietary search grounding. Instead of managing a vector database, the server relies on Google Search as the retrieval mechanism.

### Configuration Management
*   **Environment Variables**: All sensitive configuration (Project ID, Location, Model) is managed via `.env` and `process.env`.
*   **Path Resolution**: Uses `path.isAbsolute()` for cross-platform detection of relative `GOOGLE_APPLICATION_CREDENTIALS`, resolving them relative to the project root.

### Lifecycle
*   **Graceful Shutdown**: `SIGINT` and `SIGTERM` handlers close the MCP server cleanly before exit.
*   **Health Check**: `GET /health` endpoint (HTTP mode only) returns `{ "status": "ok" }` for load balancers and container orchestrators.
*   **Structured Logging**: Winston logs are written to a dedicated `logs/` subdirectory with daily rotation, and streamed to `stderr` for live monitoring.

### Safety & Thinking
*   **Safety Settings**: Harm block thresholds are explicitly set to `OFF` to prevent aggressive filtering of legitimate search results.
*   **Thinking Mode**: Configured with `thinkingLevel: ThinkingLevel.HIGH` (if supported) to encourage the model to reason through complex queries before searching.

## Key Technical Decisions
*   **`zod` for Validation**: Ensures incoming tool arguments match expected schema.
*   **Vertex AI SDK**: Direct integration with `@google/genai` rather than REST API calls for type safety and feature parity.
*   **Stream Handling**: Although the MCP response is a single block, the internal logic consumes the Gemini stream to build the full response text, handling potential stream chunks robustly.

## Codebase Structure & Function Reference

The codebase is organized in the `src/` directory to separate concerns spanning configuration, AI operations, shared utilities, and the core server lifecycle:

### `src/index.ts`
The main entry point for the MCP Server.
*   `main()`: Asynchronous bootstrapper that determines the deployment mode based on `.env`. If `PORT` is defined, it creates an Express app via `createMcpExpressApp()` (explicitly bounded to `0.0.0.0` to bypass default localhost DNS rebinding protection) and manages a mapping of stateful `StreamableHTTPServerTransport` logic on the `/mcp` endpoint multiplexed via the `mcp-session-id` request header. Otherwise, it instantiates a `StdioServerTransport` for standard command-line lifecycle managed usage. It also registers the single tool exposed by the MCP `vertex_search` and connects the requested transport mode to the initialized `McpServer`.

### `src/config/env.ts`
Centralized environment loader and validator.
*   *(No Functions)*: Parses `process.env` safely, falling back to defaults for optional values (like the AI model), explicitly converts ports to integers, and exports a frozen, typed `config` object intended for consumption by the rest of the app. Fails fast if required IDs or credentials aren't provided.

### `src/utils/logger.ts`
Centralized Winston logger instance.
*   *(No Functions)*: Configures and exports a highly-structured `winston` logger. Emits persistent rotated `.json` log lines using `winston-daily-rotate-file` in the project root, while simultaneously streaming structured logs to standard error (`stderr`) via a `Console` transport so the terminal receives live observational data without destroying MCP's exclusive hold on standard output pipeline (`stdout`).

### `src/ai/vertex.ts`
Core Gemini integration encapsulating all AI state and search execution pipelines.
*   `performSearch(options: SearchOptions, requestId: string)`: Constructs the AI prompt by dynamically appending the `site_filter` and `time_range` options if provided. Submits the prompt sequence with the Google Search `tools` attached via streaming `chat.sendMessageStream`. It implements exponential backoff to recover from rate limits (`429`) or momentary GCP outages (`503`). Collects the fully streamed chunks and intercepts safety filter triggers or hard faults, deliberately re-throwing native `McpError`s constructed with `ErrorCode.InvalidRequest` and `ErrorCode.InternalError` so any connected clients accurately interpret the crash behavior.
