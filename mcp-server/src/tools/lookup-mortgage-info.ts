import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { retrieve } from "../lib/retriever.js";

export function registerLookupMortgageInfo(server: McpServer) {
  server.tool(
    "lookup_mortgage_info",
    "Search a curated mortgage knowledge base for information about loan types (FHA, VA, conventional), PMI, DTI ratios, closing costs, credit scores, down payment strategies, and first-time buyer programs. Returns relevant documents with source citations.",
    {
      question: z.string().describe("Question about mortgages, loan types, homebuying, etc."),
    },
    async (params) => {
      const results = retrieve(params.question, 3);

      if (results.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No relevant documents found in the knowledge base for this query.",
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            documentsFound: results.length,
            results: results.map((r) => ({
              title: r.document.title,
              source: r.document.source,
              relevanceScore: Math.round(r.score * 100) / 100,
              content: r.document.content,
            })),
          }, null, 2),
        }],
      };
    }
  );
}
