import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { performSearch } from "../ai/vertex.js";

/**
 * Registers the vertex_search tool with the provided MCP server instance.
 *
 * @param server The McpServer instance to attach the tool to.
 */
export function registerSearchTool(server: McpServer) {
  server.registerTool(
    "vertex_search",
    {
      description:
        "Search the web using Google Vertex AI (Gemini) with Google Search grounding. " +
        "Returns an AI-synthesized answer with inline citations.",
      inputSchema: {
        query: z
          .string()
          .min(1, "Search query cannot be empty")
          .describe("The search query or question to research"),
        site_filter: z
          .string()
          .optional()
          .describe(
            "Optional domain to restrict search to (e.g., 'stackoverflow.com', 'github.com')"
          ),
        time_range: z
          .string()
          .optional()
          .describe(
            "Optional time range limit (e.g., 'past 24 hours', 'past week', 'past year')"
          ),
      },
    },
    async ({ query, site_filter, time_range }) => {
      const requestId = randomUUID();
      return await performSearch({ query, site_filter, time_range }, requestId);
    }
  );
}
