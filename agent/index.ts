import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { DexterAnnotation, DEFAULT_MODEL, MAX_ITERATIONS } from "./state.js";
import { LANGCHAIN_TOOLS } from "./tools.js";
import { AGENT_SYSTEM_PROMPT } from "./prompts.js";

/**
 * Custom ChatOpenAI that strips unsupported parameters for Grok models
 */
class ChatGrok extends ChatOpenAI {
  invocationParams(
    options?: Partial<ChatOpenAICallOptions>,
    extra?: { streaming?: boolean },
  ) {
    const params = super.invocationParams(options, extra);
    // Grok doesn't support these parameters
    delete (params as Record<string, unknown>).presence_penalty;
    delete (params as Record<string, unknown>).frequency_penalty;
    return params;
  }
}

// Track iterations to prevent runaway loops
let iterationCount = 0;

/**
 * Call the model with tools bound
 */
async function callModel(
  state: typeof DexterAnnotation.State,
): Promise<{ messages: BaseMessage[] }> {
  const model = new ChatGrok({
    model: DEFAULT_MODEL,
    temperature: 0,
    streamUsage: true,
    configuration: {
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    },
  });

  const modelWithTools = model.bindTools(LANGCHAIN_TOOLS);

  const response = await modelWithTools.invoke([
    { role: "system" as const, content: AGENT_SYSTEM_PROMPT },
    ...state.messages,
  ]);

  iterationCount++;
  return { messages: [response] };
}

/**
 * Route based on whether tools need to be called
 * Also enforces max iterations to prevent cost blowup
 */
function routeModelOutput(
  state: typeof DexterAnnotation.State,
): "__end__" | "tools" {
  // Safety: stop after max iterations
  if (iterationCount >= MAX_ITERATIONS) {
    console.warn(`Max iterations (${MAX_ITERATIONS}) reached, forcing end`);
    iterationCount = 0; // Reset for next run
    return "__end__";
  }

  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage._getType() === "ai") {
    const aiMessage = lastMessage as AIMessage;
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      return "tools";
    }
  }

  // Reset counter when naturally ending
  iterationCount = 0;
  return "__end__";
}

/**
 * Tool node for executing tools
 */
const toolNode = new ToolNode(LANGCHAIN_TOOLS);

/**
 * Announce what tools are about to be called
 */
function announceToolCalls(state: typeof DexterAnnotation.State): {
  messages: BaseMessage[];
} {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage._getType() !== "ai") {
    return { messages: [] };
  }

  const aiMessage = lastMessage as AIMessage;
  const toolCalls = aiMessage.tool_calls || [];

  if (toolCalls.length === 0) {
    return { messages: [] };
  }

  // Extract tool names and make them readable
  const toolNames = toolCalls.map((tc) => {
    const name = tc.name || "unknown";
    return name.replace(/_/g, " ").replace(/^get /, "");
  });

  const uniqueTools = [...new Set(toolNames)];
  const announcement = `🔍 Fetching: ${uniqueTools.join(", ")}...`;

  return {
    messages: [new AIMessage({ content: announcement })],
  };
}

/**
 * Summarize what tools were just called to keep user informed
 */
function summarizeToolResults(state: typeof DexterAnnotation.State): {
  messages: BaseMessage[];
} {
  const messages = state.messages;

  // Find recent tool messages (after the last AI message with tool calls)
  const toolMessages: ToolMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg._getType() === "tool") {
      toolMessages.unshift(msg as ToolMessage);
    } else if (msg._getType() === "ai") {
      break;
    }
  }

  if (toolMessages.length === 0) {
    return { messages: [] };
  }

  // Create a brief summary of what was retrieved
  const toolNames = toolMessages.map((tm) => {
    const name = tm.name || "unknown";
    // Make tool names more readable
    return name.replace(/_/g, " ").replace(/^get /, "");
  });

  const uniqueTools = [...new Set(toolNames)];
  const summary = `✓ Retrieved: ${uniqueTools.join(", ")}. Analyzing...`;

  return {
    messages: [new AIMessage({ content: summary })],
  };
}

/**
 * Dexter Financial Research Agent
 *
 * Simple ReAct pattern:
 * 1. Agent receives message, decides what tools to call
 * 2. Tools execute and return results
 * 3. Progress node summarizes what was retrieved
 * 4. Agent loops until it has enough info to respond
 * 5. Max 10 iterations to control costs
 */
const workflow = new StateGraph(DexterAnnotation)
  .addNode("agent", callModel)
  .addNode("announce", announceToolCalls)
  .addNode("tools", toolNode)
  .addNode("progress", summarizeToolResults)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", routeModelOutput, {
    tools: "announce",
    __end__: "__end__",
  })
  .addEdge("announce", "tools")
  .addEdge("tools", "progress")
  .addEdge("progress", "agent");

/**
 * Compiled graph - main export for LangGraph deployment
 */
export const graph = workflow.compile({
  checkpointer: new MemorySaver(),
});

graph.name = "Dexter Financial Agent";

// Re-export types
export { DexterAnnotation, type DexterState } from "./state.js";
