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
    const app = createMcpExpressApp();

    app.post("/mcp", async (req, res) => {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        res.on("close", () => {
          transport.close();
        });
      } catch (error) {
        logger.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      }
    });

    // GET and DELETE are not supported in stateless mode
    app.get("/mcp", (_req, res) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }));
    });

    app.delete("/mcp", (_req, res) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }));
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
