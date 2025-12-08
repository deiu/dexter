import type { DexterState } from "../state.js";
import { callLlm } from "../llm.js";
import { getAnswerSystemPrompt } from "../prompts.js";

export async function generateAnswerNode(
  state: DexterState,
): Promise<Partial<DexterState>> {
  if (state.toolContexts.length === 0) {
    const prompt = `Original user query: "${state.query}"

No data was collected from tools.`;

    const response = await callLlm(prompt, {
      systemPrompt: getAnswerSystemPrompt(),
      model: state.model,
    });

    return { answer: String(response) };
  }

  const formattedResults = state.toolContexts
    .map((ctx) => {
      return `Output of ${ctx.toolName} with args ${JSON.stringify(ctx.args)}:
${JSON.stringify(ctx.result, null, 2)}`;
    })
    .join("\n\n");

  const prompt = `Original user query: "${state.query}"

Data and results collected from tools:
${formattedResults}

Based on the data above, provide a comprehensive answer to the user's query.`;

  const response = await callLlm(prompt, {
    systemPrompt: getAnswerSystemPrompt(),
    model: state.model,
  });

  return { answer: String(response) };
}
