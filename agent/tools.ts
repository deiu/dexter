import { StructuredToolInterface } from "@langchain/core/tools";
import type { ToolDefinition } from "./llm.js";
import {
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getAllFinancialStatements,
  getFilings,
  get10KFilingItems,
  get10QFilingItems,
  get8KFilingItems,
  getPriceSnapshot,
  getPrices,
  getFinancialMetricsSnapshot,
  getFinancialMetrics,
  getNews,
  getAnalystEstimates,
  getSegmentedRevenues,
} from "../src/tools/finance/index.js";
import { searchGoogleNews } from "../src/tools/search/index.js";

/**
 * LangChain tools (for execution)
 */
export const LANGCHAIN_TOOLS: StructuredToolInterface[] = [
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getAllFinancialStatements,
  get10KFilingItems,
  get10QFilingItems,
  get8KFilingItems,
  getFilings,
  getPriceSnapshot,
  getPrices,
  getFinancialMetricsSnapshot,
  getFinancialMetrics,
  getNews,
  getAnalystEstimates,
  getSegmentedRevenues,
  searchGoogleNews,
];

/**
 * Tool definitions for OpenAI function calling
 */
export const TOOLS: ToolDefinition[] = LANGCHAIN_TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  schema: tool.schema as ToolDefinition["schema"],
}));

/**
 * Map of tool names to LangChain tools for execution
 */
export const TOOL_MAP = new Map(LANGCHAIN_TOOLS.map((t) => [t.name, t]));

export function getToolDescriptions(): string {
  return TOOLS.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n");
}
