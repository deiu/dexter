import type { DexterState, PlannedTask, SubTask } from "../state.js";
import { callLlm } from "../llm.js";
import { getSubtaskPlanningPrompt } from "../prompts.js";
import { SubTaskListSchema } from "../schemas.js";
import { getToolDescriptions } from "../tools.js";

export async function planSubtasksNode(
  state: DexterState
): Promise<Partial<DexterState>> {
  const toolDescriptions = getToolDescriptions();
  const systemPrompt = getSubtaskPlanningPrompt(toolDescriptions);

  const plannedTasks: PlannedTask[] = await Promise.all(
    state.tasks.map(async (task) => {
      const prompt = `Task to complete: "${task.description}"

Break down this task into specific, actionable subtasks. Keep each subtask short and concise.`;

      try {
        const response = await callLlm(prompt, {
          systemPrompt,
          outputSchema: SubTaskListSchema,
          model: state.model,
        });

        const result = response as { subTasks: SubTask[] };
        return { task, subTasks: result.subTasks || [] };
      } catch {
        return { task, subTasks: [] };
      }
    })
  );

  return { plannedTasks };
}
