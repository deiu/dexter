import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';

const CompanyFactsInputSchema = z.object({
  ticker: z
    .string()
    .describe(
      "The stock ticker symbol to fetch company facts for. For example, 'AAPL' for Apple."
    ),
});

export const getCompanyFacts = new DynamicStructuredTool({
  name: 'get_company_facts',
  description: `Fetches basic company information and facts. Includes company name, CIK, industry, sector, exchange, market cap, description, headquarters location, website, number of employees, and other key facts. Useful for getting a quick overview of a company before deeper analysis.`,
  schema: CompanyFactsInputSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {
      ticker: input.ticker,
    };
    const data = await callApi('/company/facts/', params);
    return JSON.stringify(data.company_facts || data);
  },
});
