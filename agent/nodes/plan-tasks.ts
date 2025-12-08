import type { DexterState, Task } from "../state.js";
import { callLlm } from "../llm.js";
import { PLANNING_SYSTEM_PROMPT } from "../prompts.js";
import { TaskListSchema } from "../schemas.js";

export async function planTasksNode(
  state: DexterState
): Promise<Partial<DexterState>> {
  const prompt = `Given the user query: "${state.query}"

Create a list of tasks to be completed. Each task should be a specific, actionable step.

Remember:
- Make tasks specific, focused, and concise in 50 characters or less
- Include relevant details like ticker
- 1-4 tasks is typical`;

  const response = await callLlm(prompt, {
    systemPrompt: PLANNING_SYSTEM_PROMPT,
    outputSchema: TaskListSchema,
    model: state.model,
  });

  const result = response as { tasks: Task[] };
  const tasks = result.tasks || [];

  return {
    tasks: tasks.map((task) => ({
      ...task,
      done: task.done ?? false,
    })),
  };
}
