import { ChatOpenAI } from "@langchain/openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import { DEFAULT_MODEL } from "./state.js";

/**
 * Tool definition for OpenAI function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodTypeAny;
}

/**
 * Tool call returned by the model
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * LLM response - either content or tool calls
 */
export interface LlmResponse {
  content: string | null;
  toolCalls: ToolCall[];
}

interface CallLlmOptions {
  model?: string;
  systemPrompt?: string;
  outputSchema?: ZodTypeAny;
  tools?: ToolDefinition[];
}

/**
 * Get a ChatOpenAI instance
 */
export function getModel(modelName: string = DEFAULT_MODEL): ChatOpenAI {
  return new ChatOpenAI({
    modelName,
    temperature: 0,
  });
}

/**
 * Call OpenAI API using LangChain ChatOpenAI
 */
export async function callLlm(
  prompt: string,
  options: CallLlmOptions = {},
): Promise<unknown> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt = "You are a helpful assistant.",
    outputSchema,
    tools,
  } = options;

  const llm = new ChatOpenAI({
    modelName: model,
    temperature: 0,
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  try {
    // If structured output is requested, use withStructuredOutput
    if (outputSchema) {
      const structuredLlm = llm.withStructuredOutput(outputSchema);
      const response = await structuredLlm.invoke(messages);
      return response;
    }

    // If tools are provided, use bindTools
    if (tools && tools.length > 0) {
      const openaiTools = tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.schema as ZodTypeAny, {
            $refStrategy: "none",
          }) as Record<string, unknown>,
        },
      }));

      const modelWithTools = llm.bindTools(openaiTools);
      const response = await modelWithTools.invoke(messages);

      const toolCalls: ToolCall[] = [];
      if (response.tool_calls && Array.isArray(response.tool_calls)) {
        for (const tc of response.tool_calls) {
          toolCalls.push({
            name: tc.name,
            args: tc.args as Record<string, unknown>,
          });
        }
      }

      const result: LlmResponse = {
        content: typeof response.content === "string" ? response.content : null,
        toolCalls,
      };

      return result;
    }

    // Simple completion without tools or structured output
    const response = await llm.invoke(messages);
    return typeof response.content === "string" ? response.content : "";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw error;
  }
}
