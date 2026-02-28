# Active Context: Vertex Search MCP Server

## Current Focus
Validating the stateless Streamable HTTP transport pattern and per-request chat isolation.

## Recent Changes
*   **Dual Deployment Architecture**: The MCP supports two distinct modes dictated by `.env`:
    1.  **Standard I/O**: Runs as a CLI script managed by the AI Client (when `PORT` is omitted).
    2.  **Streamable HTTP**: Runs as a standalone background service via a single `POST /mcp` endpoint using `createMcpExpressApp` and `StreamableHTTPServerTransport` in stateless mode (when `PORT` is defined).
*   **Per-Request Chat Isolation**: Each `vertex_search` call creates a fresh Gemini chat session, preventing conversation history from leaking across unrelated queries.
*   **Real-time Logging**: Added `winston.transports.Console` routed to `stderr` to allow users to view live server logs without breaking the MCP STDOUT/STDIN communication protocol.
*   **Rich MCP Errors**: Replaced generic text errors with standard `McpError` throws mapped to `ErrorCode.InvalidRequest` and `ErrorCode.InternalError` for better client parsing.
*   **Search Filters**: Added `site_filter` and `time_range` arguments to the `vertex_search` MCP tool schema, allowing Claude to intelligently scope down searches.
*   **Structured Logging**: Replaced custom `Logger` with `winston` and `winston-daily-rotate-file` for JSON-structured logs and daily rotation (`server-YYYY-MM-DD.log`).
*   **Configurable Model**: Added `GEMINI_MODEL` and `MODEL_SYSTEM_INSTRUCTION` environment variables to allow model swapping without code changes.
*   **Configurable Generation Parameters**: Added optional `MAX_OUTPUT_TOKENS`, `TEMPERATURE`, `TOP_P`, and `MAX_RETRIES` environment variables to tune AI generation behavior without code changes.
*   **Added Retry Logic**: Implemented exponential backoff for `503` and `429` errors in Vertex AI calls.
*   **Improved Error Handling**: Added specific handling for safety blocks and critical stream errors.
*   **Fixed Authentication**: Resolved previous credential issues.
*   **Graceful Shutdown**: Added `SIGINT`/`SIGTERM` handlers to cleanly close the MCP server before exit.
*   **Logs Directory**: Log files now write to a dedicated `logs/` subdirectory instead of the project root.
*   **Cross-Platform Path Resolution**: Replaced manual path prefix checks with `path.isAbsolute()` for reliable credential path detection on both Unix and Windows.

## Open Tasks
*   Consider implementing unit tests with vitest to mock Vertex AI responses.
*   Consider wrapping the application in a Dockerfile for simpler deployment.

## Next Steps
Deploy updated server and verify log output during active usage.
