import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { callApi } from "./api.js";

const CryptoPricesInputSchema = z.object({
  ticker: z
    .string()
    .describe(
      "The cryptocurrency ticker symbol. For example, 'BTC' for Bitcoin, 'ETH' for Ethereum, 'SOL' for Solana.",
    ),
  interval: z
    .enum(["minute", "hour", "day", "week", "month"])
    .nullable()
    .optional()
    .default("day")
    .describe("The time interval for price data. Defaults to 'day'."),
  interval_multiplier: z
    .number()
    .nullable()
    .optional()
    .default(1)
    .describe("Multiplier for the interval. Defaults to 1."),
  start_date: z
    .string()
    .describe("Start date in YYYY-MM-DD format. Required."),
  end_date: z.string().describe("End date in YYYY-MM-DD format. Required."),
});

export const getCryptoPrices = new DynamicStructuredTool({
  name: "get_crypto_prices",
  description: `Retrieves historical price data for a cryptocurrency over a specified date range. Includes open, high, low, close prices and volume. Use this for Bitcoin (BTC), Ethereum (ETH), Solana (SOL), and other major cryptocurrencies.`,
  schema: CryptoPricesInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | null | undefined> = {
      ticker: input.ticker.toUpperCase(),
      interval: input.interval,
      interval_multiplier: input.interval_multiplier,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const data = await callApi("/crypto/prices/", params);
    return JSON.stringify(data.prices || []);
  },
});
