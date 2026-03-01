import { randomUUID } from "node:crypto";
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

// Factory function to create a fresh McpServer instance per connection
function getServer() {
  const server = new McpServer({
    name: "vertex-search",
    version: "1.0.0",
  });

  // Register tools
  registerSearchTool(server);
  return server;
}

// Global server for stdio mode that requires it as a singleton
let stdioServer: McpServer | null = null;

async function main() {
  if (config.port) {
    // HTTP mode: Streamable HTTP transport
    // Use host 0.0.0.0 to disable localhost DNS rebinding protection (fixes 403 on remote servers)
    const app = createMcpExpressApp({ host: "0.0.0.0" });

    // Store active sessions mapping sessionId to transport
    const transports = new Map<string, StreamableHTTPServerTransport>();

    app.all("/mcp", async (req, res) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports.has(sessionId)) {
          // 1. Existing Session (GET, POST, DELETE)
          transport = transports.get(sessionId)!;
        } else if (!sessionId && req.method === "POST") {
          // 2. New Session Initialization (POST without session ID)
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              logger.info(`StreamableHTTP session initialized with ID: \${sid}`);
              transports.set(sid, transport);
            }
          });

          transport.onclose = () => {
            if (transport.sessionId) {
              logger.info(`Transport closed for session \${transport.sessionId}`);
              transports.delete(transport.sessionId);
            }
          };

          // Crucial fix: The MCP protocol requires ONE server instance per transport.
          // We must spin up a fresh server closure for this specific HTTP client session.
          const sessionServer = getServer();
          await sessionServer.connect(transport);
        } else {
          // 3. Invalid Request
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Invalid session ID or request missing initialization parameters" },
            id: null
          });
          return;
        }

        // Delegate handling of this specific HTTP request to the transport layer
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
    stdioServer = getServer();
    await stdioServer.connect(transport);
    console.error("vertex-search MCP server running on stdio");
    logger.info("Vertex Search MCP server started on stdio");
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down...");
  if (stdioServer) {
    await stdioServer.close();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
