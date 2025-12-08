import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { callApi } from "./api.js";

const SearchLineItemsInputSchema = z.object({
  line_items: z
    .array(z.string())
    .describe(
      "List of financial line items to search for. Examples: 'revenue', 'net_income', 'total_assets', 'gross_profit', 'operating_income', 'ebitda', 'free_cash_flow', 'earnings_per_share_basic', 'total_debt'. Use snake_case.",
    ),
  tickers: z
    .array(z.string())
    .describe(
      "List of stock ticker symbols to search across. For example: ['AAPL', 'MSFT', 'GOOGL']. This is more efficient than calling individual endpoints for each ticker.",
    ),
  period: z
    .enum(["annual", "quarterly", "ttm"])
    .describe(
      "The reporting period for the financial data. 'annual' for yearly, 'quarterly' for quarterly, and 'ttm' for trailing twelve months.",
    ),
  limit: z
    .number()
    .nullable()
    .optional()
    .default(10)
    .describe("Maximum number of periods to return per ticker (default: 10)."),
});

export const searchLineItems = new DynamicStructuredTool({
  name: "search_line_items",
  description: `Powerful search tool for fetching specific financial line items across multiple tickers in a single request. Much more efficient than calling individual financial statement endpoints when comparing companies. Supports any line item from income statements, balance sheets, and cash flow statements. Ideal for peer comparisons, screening, and trend analysis across companies.`,
  schema: SearchLineItemsInputSchema,
  func: async (input) => {
    const params: Record<
      string,
      string | number | string[] | null | undefined
    > = {
      line_items: input.line_items,
      tickers: input.tickers,
      period: input.period,
      limit: input.limit,
    };
    const data = await callApi("/financials/search/line-items/", params);
    return JSON.stringify(data.search_results || []);
  },
});

const SearchFinancialsInputSchema = z.object({
  tickers: z
    .array(z.string())
    .describe(
      "List of stock ticker symbols to search across. For example: ['AAPL', 'MSFT', 'GOOGL'].",
    ),
  period: z
    .enum(["annual", "quarterly", "ttm"])
    .describe(
      "The reporting period for the financial data. 'annual' for yearly, 'quarterly' for quarterly, and 'ttm' for trailing twelve months.",
    ),
  limit: z
    .number()
    .nullable()
    .optional()
    .default(10)
    .describe("Maximum number of periods to return per ticker (default: 10)."),
});

export const searchFinancials = new DynamicStructuredTool({
  name: "search_financials",
  description: `Fetches complete financial statements (income statements, balance sheets, cash flow statements) for multiple tickers in a single request. More efficient than calling getAllFinancialStatements multiple times when analyzing several companies. Returns the full financials for each ticker.`,
  schema: SearchFinancialsInputSchema,
  func: async (input) => {
    const params: Record<
      string,
      string | number | string[] | null | undefined
    > = {
      tickers: input.tickers,
      period: input.period,
      limit: input.limit,
    };
    const data = await callApi("/financials/search/", params);
    return JSON.stringify(data.search_results || []);
  },
});
