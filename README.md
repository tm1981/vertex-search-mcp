# Vertex Search MCP Server

The **Vertex Search MCP Server** is a Model Context Protocol (MCP) server that connects AI assistants to real-time web information. It leverages Google Vertex AI with Google Search Grounding to provide accurate, up-to-date, and cited answers to user queries.

This solves the problem of AI models lacking real-time information and helps eliminate hallucinations by grounding responses in live Google Search results.

## Features

- **Google Search Grounding**: Automatically searches the web to synthesize answers.
- **Real-Time Knowledge**: Enables AI agents to access information beyond their training data cutoff.
- **Inline Citations**: Provides trust by including sources for factual claims.
- **Thinking Models**: Uses high-reasoning Gemini models to handle complex queries.
- **Robust Error Handling**: Gracefully handles empty results and API errors (including retry logic and backoff for rate limits).

## Prerequisites

- An **MCP-compatible client** (e.g., Claude Desktop, LM Studio, Cursor, Claude Code) to interact with the server.
- Node.js (v22 or higher recommended)
- A Google Cloud Project with the following APIs enabled:
  - **Vertex AI API**
- Google Cloud credentials (JSON service account key) with the **Vertex AI User** role.

## Installation

1. Clone or download this repository.
2. Install the project dependencies:

   ```bash
   npm install
   ```

3. Build the TypeScript code:

   ```bash
   npm run build
   ```

## Configuration

Create a `.env` file in the root of the project and add the following configuration values:

```env
# Your Google Cloud Project ID
GOOGLE_CLOUD_PROJECT=your-project-id

# The Google Cloud region (e.g., us-central1)
GOOGLE_CLOUD_LOCATION=us-central1

# Absolute path to your Google Cloud Service Account JSON key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json

# Optional: The Gemini model to use (defaults to gemini-3-flash-preview)
GEMINI_MODEL=gemini-3-flash-preview

# Optional: Custom system instructions to override the default behavior
# MODEL_SYSTEM_INSTRUCTION="Your custom system instructions..."

# Optional: Run as a Streamable HTTP Server (instead of standard I/O) by defining a port
# PORT=3000

# Optional: AI generation tuning (defaults shown)
# MAX_OUTPUT_TOKENS=30090
# TEMPERATURE=1
# TOP_P=0.95
# MAX_RETRIES=3
```

## Usage

This MCP server supports two distinct deployment modes. **The mode is automatically determined by your `.env` file.** If you define a `PORT` variable, it runs as an HTTP Server (Option 2). If you omit the `PORT` variable, it runs as a command-line utility (Option 1).

### Option 1: Standard I/O (Integration Mode)
*Use this option if you want your AI client (like Claude Desktop or LM Studio) to automatically manage and run the server in the background for you.*

**Important:** Make sure `PORT` is deleted or commented out in your `.env` file.

Add the following JSON configuration to your client's settings (e.g., `claude_desktop_config.json` or LM Studio's `mcp.json`/`mcp_config.json`):

```json
{
  "mcpServers": {
    "vertex-search": {
      "command": "node",
      "args": [
        "C:/dev/vertex-search-mcp/dist/index.js"
      ],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GOOGLE_APPLICATION_CREDENTIALS": "C:/path/to/your/service-account-key.json"
      }
    }
  }
}
```
*Note: Replace the file paths and project details with your actual system paths.*


### Option 2: Network Server (Streamable HTTP)
*Use this option if you want to host the server yourself (e.g., in a separate terminal, a Docker container, or a remote cloud server) and point clients to its URL.*

**Important:** You **must** define a `PORT` in your `.env` file (e.g., `PORT=3000`).

**Step 1:** Start the server manually.
```bash
npm run build
node dist/index.js
```
*(You should see an output indicating the server is running on `http://localhost:3000/mcp`)*

**Step 2:** Configure your client.
In LM Studio (or any other MCP client), edit your `mcp.json` / `mcp_config.json` to include the `url` rather than a `command`:

```json
{
  "mcpServers": {
    "vertex-search-http": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Available Tools

When running, the server exposes exactly one tool to the connected MCP client:

- `vertex_search`: A powerful search tool that takes a user query, performs a grounded Google Search using Vertex AI, and returns a verified answer with inline citations.
  - **Optional Arguments**:
    - `site_filter`: Restrict the search results to a specific domain (e.g., `stackoverflow.com`).
    - `time_range`: Restrict the search results to a specific timeframe (e.g., `past 24 hours`).

## Logging & Observability

The server uses [winston](https://github.com/winstonjs/winston) with daily rotation. Logs are written to `logs/server-YYYY-MM-DD.log` and streamed to `stderr` for live monitoring. Check these files if you encounter issues.

### Health Check (HTTP Mode Only)

When running in HTTP mode, a health endpoint is available for load balancers and container orchestrators:

```
GET /health → { "status": "ok" }
```
