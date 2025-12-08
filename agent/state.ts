import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Tool context stored in state
 */
export interface ToolContext {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  summary: string;
  taskId?: number;
}

/**
 * High-level task
 */
export interface Task {
  id: number;
  description: string;
  done: boolean;
}

/**
 * Subtask - a specific unit of work
 */
export interface SubTask {
  id: number;
  description: string;
}

/**
 * Task with its planned subtasks
 */
export interface PlannedTask {
  task: Task;
  subTasks: SubTask[];
}

/**
 * Default model - OpenAI GPT-4.1
 */
export const DEFAULT_MODEL = "gpt-4o";

/**
 * LangGraph state annotation for Dexter
 */
export const DexterAnnotation = Annotation.Root({
  /**
   * The user's query (required input)
   */
  query: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  /**
   * Message history for multi-turn conversations
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),

  /**
   * Model to use for LLM calls
   */
  model: Annotation<string>({
    reducer: (_, update) => update || DEFAULT_MODEL,
    default: () => DEFAULT_MODEL,
  }),

  /**
   * Planned high-level tasks
   */
  tasks: Annotation<Task[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  /**
   * Tasks with their subtasks
   */
  plannedTasks: Annotation<PlannedTask[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  /**
   * Tool execution contexts
   */
  toolContexts: Annotation<ToolContext[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /**
   * Final answer to the user's query
   */
  answer: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

export type DexterState = typeof DexterAnnotation.State;
