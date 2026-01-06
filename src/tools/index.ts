import { StructuredToolInterface } from "@langchain/core/tools";
import { searchPerplexity } from "./search/index.js";

export const TOOLS: StructuredToolInterface[] = [searchPerplexity];

export { searchPerplexity };
