#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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
    // HTTP mode: SSE transport for standard MCP clients
    // Use host 0.0.0.0 to disable localhost DNS rebinding protection (fixes 403 on remote servers)
    const app = createMcpExpressApp({ host: "0.0.0.0" });

    // Store active SSE connections
    const transports = new Map<string, any>();

    app.get("/sse", async (req, res) => {
      logger.info("New SSE connection established");

      // Use standard SSEServerTransport supporting /message endpoint for incoming POSTs
      const transport = new SSEServerTransport("/message", res);
      transports.set(transport.sessionId, transport);

      res.on("close", () => {
        logger.info(`SSE connection closed for session: ${transport.sessionId}`);
        transports.delete(transport.sessionId);
      });

      try {
        await server.connect(transport);
      } catch (error) {
        logger.error("Error connecting server to transport:", error);
      }
    });

    app.post("/message", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);

      if (!transport) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found" },
          id: null,
        });
        return;
      }

      try {
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error(`Error handling message for session ${sessionId}:`, error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
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
