import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { callApi } from "./api.js";

const InsiderTradesInputSchema = z.object({
  ticker: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The stock ticker symbol to fetch insider trades for. For example, 'AAPL' for Apple. Optional if using owner_cik.",
    ),
  owner_cik: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The CIK (Central Index Key) of the insider/owner. Useful for tracking a specific insider across companies.",
    ),
  limit: z
    .number()
    .nullable()
    .optional()
    .default(100)
    .describe("Maximum number of insider trades to return (default: 100)."),
  transaction_date_gt: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for trades after this date (YYYY-MM-DD)."),
  transaction_date_gte: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for trades on or after this date (YYYY-MM-DD)."),
  transaction_date_lt: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for trades before this date (YYYY-MM-DD)."),
  transaction_date_lte: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for trades on or before this date (YYYY-MM-DD)."),
});

export const getInsiderTrades = new DynamicStructuredTool({
  name: "get_insider_trades",
  description: `Fetches insider trading data for a company or specific insider. Shows when company executives, directors, and major shareholders buy or sell shares. Useful for understanding insider sentiment and potential signals about company prospects. Includes transaction type (buy/sell), shares traded, price, and ownership details.`,
  schema: InsiderTradesInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | null | undefined> = {
      ticker: input.ticker,
      owner_cik: input.owner_cik,
      limit: input.limit,
      transaction_date_gt: input.transaction_date_gt,
      transaction_date_gte: input.transaction_date_gte,
      transaction_date_lt: input.transaction_date_lt,
      transaction_date_lte: input.transaction_date_lte,
    };
    const data = await callApi("/insider-trades/", params);
    return JSON.stringify(data.insider_trades || []);
  },
});
