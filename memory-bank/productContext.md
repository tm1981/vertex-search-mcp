# Product Context: Vertex Search MCP Server

## Why This Project Exists
AI models, while powerful, often lack real-time information or deep knowledge of current events. Users interacting with AI assistants (e.g., in IDEs or chat interfaces) frequently need answers that require up-to-the-minute data or specific technical documentation that isn't in the model's training set.

This project bridges that gap by providing a **Grounded Search Tool** via the Model Context Protocol (MCP). It allows any MCP-compatible client to seamlessly integrate Google Search capabilities into their AI workflow.

## Problems Solved
1.  **Hallucinations**: By grounding responses in Google Search results, the server significantly reduces the likelihood of the AI inventing facts.
2.  **Stale Data**: Access to the live web ensures answers reflect the latest information.
3.  **Lack of Transparency**: Inline citations allow users to verify the source of information directly.
4.  **Complex Queries**: The server uses advanced reasoning models (Gemini 1.5 Pro/Flash or similar) to break down complex questions into searchable components.

## User Experience
The user interacts with an AI assistant as normal. When they ask a question requiring external information (e.g., "What is the latest version of React?" or "How do I fix error X in library Y?"), the assistant:
1.  Recognizes the need for search.
2.  Calls the `vertex_search` tool with a specific query.
3.  The tool performs the search and synthesizes an answer with citations.
4.  The assistant presents this grounded answer to the user.

From the user's perspective, the AI simply "knows" the answer, but with the added confidence of verifyable sources.
