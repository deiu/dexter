import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { callApi } from "./api.js";

const EarningsPressReleasesInputSchema = z.object({
  ticker: z
    .string()
    .describe(
      "The stock ticker symbol to fetch earnings press releases for. For example, 'AAPL' for Apple.",
    ),
  limit: z
    .number()
    .nullable()
    .optional()
    .default(10)
    .describe(
      "Maximum number of earnings press releases to return (default: 10).",
    ),
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

export const getEarningsPressReleases = new DynamicStructuredTool({
  name: "get_earnings_press_releases",
  description: `Fetches earnings press releases from 8-K filings. These contain the company's official earnings announcements with revenue, EPS, guidance, and management commentary. More detailed than structured earnings data as it includes narrative context and forward guidance. Useful for understanding earnings beats/misses and management outlook.`,
  schema: EarningsPressReleasesInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | null | undefined> = {
      ticker: input.ticker,
      limit: input.limit,
      report_date_gt: input.report_date_gt,
      report_date_gte: input.report_date_gte,
      report_date_lt: input.report_date_lt,
      report_date_lte: input.report_date_lte,
    };
    const data = await callApi("/earnings/press-releases/", params);
    return JSON.stringify(data.earnings || []);
  },
});
