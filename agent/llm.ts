import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import { DEFAULT_MODEL } from "./state.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Call OpenAI API directly
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

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  try {
    // If structured output is requested, use JSON mode with schema in prompt
    if (outputSchema) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(outputSchema as any, {
        $refStrategy: "none",
      });

      // Add schema to system prompt for guidance
      const schemaPrompt = `${systemPrompt}

You must respond with valid JSON matching this schema:
${JSON.stringify(jsonSchema, null, 2)}`;

      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: schemaPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      return content ? JSON.parse(content) : null;
    }

    // If tools are provided, use function calling
    if (tools && tools.length > 0) {
      const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parameters: zodToJsonSchema(tool.schema as any, {
            $refStrategy: "none",
          }) as Record<string, unknown>,
        },
      }));

      const response = await openai.chat.completions.create({
        model,
        messages,
        tools: openaiTools,
      });

      const message = response.choices[0].message;
      const toolCalls: ToolCall[] = [];

      // Handle tool calls - check for the tool_calls array
      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls) {
          // Access function property safely
          const func = (
            tc as { function?: { name: string; arguments: string } }
          ).function;
          if (func) {
            toolCalls.push({
              name: func.name,
              args: JSON.parse(func.arguments),
            });
          }
        }
      }

      const result: LlmResponse = {
        content: message.content,
        toolCalls,
      };

      return result;
    }

    // Simple completion without tools or structured output
    const response = await openai.chat.completions.create({
      model,
      messages,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw error;
  }
}

/**
 * Call OpenAI API with streaming response
 */
export async function* callLlmStream(
  prompt: string,
  options: { model?: string; systemPrompt?: string } = {},
): AsyncGenerator<string> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt = "You are a helpful assistant.",
  } = options;

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
