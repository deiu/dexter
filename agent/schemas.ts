import { z } from "zod";

export const TaskSchema = z.object({
  id: z.number().describe("Unique identifier for the task."),
  description: z.string().describe("The description of the task."),
  done: z.boolean().default(false).describe("Whether the task is completed."),
});

export const TaskListSchema = z.object({
  tasks: z.array(TaskSchema).describe("The list of tasks."),
});

export const SubTaskSchema = z.object({
  id: z.number().describe("Unique identifier for the subtask"),
  description: z.string().describe("Human-readable description of the subtask"),
});

export const SubTaskListSchema = z.object({
  subTasks: z.array(SubTaskSchema).describe("List of subtasks to complete the task"),
});
