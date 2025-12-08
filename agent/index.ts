import { StateGraph } from "@langchain/langgraph";
import { DexterAnnotation, type DexterState } from "./state.js";
import {
  planTasksNode,
  planSubtasksNode,
  executeSubtasksNode,
  generateAnswerNode,
} from "./nodes/index.js";

/**
 * Routing: skip execution if no tasks planned
 */
function routeAfterPlanning(state: DexterState): string {
  return state.tasks.length === 0 ? "generateAnswer" : "planSubtasks";
}

/**
 * Dexter Financial Research Agent
 *
 * Input: { query: "your question" }
 *
 * Flow:
 * 1. planTasks - Break query into research tasks
 * 2. planSubtasks - Break tasks into subtasks
 * 3. executeSubtasks - Run tools to gather data
 * 4. generateAnswer - Synthesize final answer
 */
const workflow = new StateGraph(DexterAnnotation)
  .addNode("planTasks", planTasksNode)
  .addNode("planSubtasks", planSubtasksNode)
  .addNode("executeSubtasks", executeSubtasksNode)
  .addNode("generateAnswer", generateAnswerNode)
  .addEdge("__start__", "planTasks")
  .addConditionalEdges("planTasks", routeAfterPlanning, [
    "planSubtasks",
    "generateAnswer",
  ])
  .addEdge("planSubtasks", "executeSubtasks")
  .addEdge("executeSubtasks", "generateAnswer")
  .addEdge("generateAnswer", "__end__");

/**
 * Compiled graph - main export for LangGraph deployment
 */
export const graph = workflow.compile();

// Re-export types
export { DexterAnnotation, type DexterState } from "./state.js";
export type { Task, SubTask, PlannedTask, ToolContext } from "./state.js";
