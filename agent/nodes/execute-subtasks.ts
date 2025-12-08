import type { DexterState, ToolContext } from "../state.js";
import { callLlm, type LlmResponse } from "../llm.js";
import {
  SUBTASK_EXECUTION_SYSTEM_PROMPT,
  TOOL_SUMMARY_SYSTEM_PROMPT,
} from "../prompts.js";
import { TOOLS, TOOL_MAP } from "../tools.js";

const MAX_ITERATIONS = 5;

async function generateSummary(
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
  model: string,
): Promise<string> {
  const resultStr = JSON.stringify(result).slice(0, 1000);
  const prompt = `Tool: ${toolName}
Arguments: ${JSON.stringify(args)}
Output preview: ${resultStr}

Generate a brief one-sentence summary.`;

  try {
    const response = await callLlm(prompt, {
      systemPrompt: TOOL_SUMMARY_SYSTEM_PROMPT,
      model,
    });
    return typeof response === "string"
      ? response.trim()
      : String(response).trim();
  } catch {
    return `${toolName} output with args ${JSON.stringify(args)}`;
  }
}

export async function executeSubtasksNode(
  state: DexterState,
): Promise<Partial<DexterState>> {
  const newContexts: ToolContext[] = [];

  for (const plannedTask of state.plannedTasks) {
    for (const subTask of plannedTask.subTasks) {
      const outputSummaries: string[] = [];

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const outputHistory =
          outputSummaries.length > 0
            ? outputSummaries.join("\n")
            : "No tool outputs yet.";

        const prompt = `Task: "${plannedTask.task.description}"
Subtask: "${subTask.description}"

Tool outputs so far:
${outputHistory}

Based on the subtask and any existing outputs, determine what tool calls (if any) are needed.`;

        const response = (await callLlm(prompt, {
          systemPrompt: SUBTASK_EXECUTION_SYSTEM_PROMPT,
          tools: TOOLS,
          model: state.model,
        })) as LlmResponse;

        // If no tool calls, subtask is complete
        if (!response.toolCalls || response.toolCalls.length === 0) {
          break;
        }

        for (const toolCall of response.toolCalls) {
          const tool = TOOL_MAP.get(toolCall.name);
          if (!tool) {
            outputSummaries.push(`Error: Tool not found: ${toolCall.name}`);
            continue;
          }

          try {
            const result = await tool.invoke(toolCall.args);
            const summary = await generateSummary(
              toolCall.name,
              toolCall.args,
              result,
              state.model,
            );

            newContexts.push({
              toolName: toolCall.name,
              args: toolCall.args,
              result,
              summary,
              taskId: plannedTask.task.id,
            });
            outputSummaries.push(`Output of ${toolCall.name}: ${summary}`);
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            outputSummaries.push(`Error from ${toolCall.name}: ${errorMsg}`);
          }
        }
      }
    }
  }

  return { toolContexts: newContexts };
}
