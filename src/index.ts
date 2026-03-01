#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";

// Initialize config and logger first
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { registerSearchTool } from "./tools/search.js";

// Ensure required config handles are loaded (which env.ts already enforces)
if (!config.projectId) {
  process.exit(1);
}

const server = new McpServer({
  name: "vertex-search",
  version: "1.0.0",
});

// Register tools
registerSearchTool(server);

async function main() {
  if (config.port) {
    // HTTP mode: stateless Streamable HTTP transport on a single /mcp endpoint
    // Use host 0.0.0.0 to disable localhost DNS rebinding protection (fixes 403 on remote servers)
    const app = createMcpExpressApp({ host: "0.0.0.0" });

    app.all("/mcp", async (req, res) => {
      // In stateless mode, we just pass undefined to generate a new session per request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      } finally {
        // Clean up transport immediately after handling the request
        await transport.close();
      }
    });

    // Health check for load balancers / container orchestrators
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    app.listen(config.port, () => {
      console.error(`vertex-search MCP server running at http://localhost:${config.port}/mcp`);
      logger.info(`Vertex Search MCP server listening on port ${config.port}`);
    });
  } else {
    // stdio mode: single transport managed by the AI client
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("vertex-search MCP server running on stdio");
    logger.info("Vertex Search MCP server started on stdio");
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down...");
  await server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
