# Project Brief: Vertex Search MCP Server

## Overview
The **Vertex Search MCP Server** is a specialized Model Context Protocol (MCP) server that connects AI assistants to real-time web information. It leverages **Google Vertex AI** with **Google Search Grounding** to provide accurate, up-to-date, and cited answers to user queries.

## Core Goals
1.  **Real-Time Knowledge**: Enable AI agents to access information beyond their training integration cutoff.
2.  **Grounded Answers**: Use Google Search infrastructure to verify facts and reduce hallucinations.
3.  **Citation Support**: Provide trust by including inline citations for factual claims.
4.  **MCP Compliance**: Fully implement the Model Context Protocol to ensure compatibility with any MCP-compliant client (e.g., Claude Desktop, IDEs).

## Key Features
*   **`vertex_search` Tool**: A single, powerful tool exposed to the MCP client.
*   **Google Search Grounding**: Automatically searches the web and synthesizes answers using Gemini models.
*   **Thinking Models**: Configured to use high-reasoning "thinking" or preview models for complex query handling.
*   **Robust Error Handling**: Graceful handling of empty results and API errors.
