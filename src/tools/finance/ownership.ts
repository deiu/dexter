import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { callApi } from "./api.js";

const InstitutionalOwnershipInputSchema = z.object({
  ticker: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The stock ticker symbol to fetch institutional ownership for. For example, 'AAPL' for Apple. Optional if using investor_cik.",
    ),
  investor_cik: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The CIK (Central Index Key) of the institutional investor. Useful for tracking a specific fund/institution holdings.",
    ),
  limit: z
    .number()
    .nullable()
    .optional()
    .default(100)
    .describe("Maximum number of ownership records to return (default: 100)."),
  report_date_gt: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for reports after this date (YYYY-MM-DD)."),
  report_date_gte: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for reports on or after this date (YYYY-MM-DD)."),
  report_date_lt: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for reports before this date (YYYY-MM-DD)."),
  report_date_lte: z
    .string()
    .nullable()
    .optional()
    .describe("Filter for reports on or before this date (YYYY-MM-DD)."),
});

export const getInstitutionalOwnership = new DynamicStructuredTool({
  name: "get_institutional_ownership",
  description: `Fetches institutional ownership data from 13F filings. Shows which hedge funds, mutual funds, pension funds, and other institutions hold positions in a stock. Useful for understanding institutional sentiment, tracking smart money, and identifying potential catalysts. Includes position size, shares held, and market value.`,
  schema: InstitutionalOwnershipInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | null | undefined> = {
      ticker: input.ticker,
      investor_cik: input.investor_cik,
      limit: input.limit,
      report_date_gt: input.report_date_gt,
      report_date_gte: input.report_date_gte,
      report_date_lt: input.report_date_lt,
      report_date_lte: input.report_date_lte,
    };
    const data = await callApi("/institutional-ownership/", params);
    return JSON.stringify(data.institutional_ownership || []);
  },
});
