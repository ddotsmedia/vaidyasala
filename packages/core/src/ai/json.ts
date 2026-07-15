import type { z } from "zod";
import type { LlmProvider, PromptTask, ProviderCost } from "./types";

/** Pull the first JSON object/array out of a model response (tolerates fences). */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start === -1) return body.trim();
  // Walk to the matching closing bracket to ignore trailing prose.
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return body.slice(start).trim();
}

function addCost(a: ProviderCost, b: ProviderCost): ProviderCost {
  return {
    usd: Number((a.usd + b.usd).toFixed(6)),
    inputUnits: a.inputUnits + b.inputUnits,
    outputUnits: a.outputUnits + b.outputUnits,
    model: b.model,
  };
}

export interface ParsedResult<T> {
  data: T;
  cost: ProviderCost;
  attempts: number;
}

/**
 * Run an LLM task and Zod-parse its JSON output, repairing on failure up to
 * `maxRepairs` times by feeding the validation error back (§8.1). Costs from
 * every attempt (including repairs) accumulate.
 */
export async function completeJson<T>(
  llm: LlmProvider,
  task: PromptTask,
  schema: z.ZodType<T>,
  maxRepairs = 2,
): Promise<ParsedResult<T>> {
  let cost: ProviderCost = { usd: 0, inputUnits: 0, outputUnits: 0, model: "" };
  let lastRaw = "";
  let lastError = "";

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const activeTask: PromptTask =
      attempt === 0
        ? task
        : {
            ...task,
            user: `${task.user}\n\nYour previous response failed schema validation with:\n${lastError}\n\nPrevious response:\n${lastRaw}\n\nReturn ONLY corrected JSON that satisfies the schema. No prose, no code fences.`,
          };

    const res = await llm.complete(activeTask);
    cost = addCost(cost, res.cost);
    lastRaw = res.text;

    let candidate: unknown;
    try {
      candidate = JSON.parse(extractJson(res.text));
    } catch (e) {
      lastError = `Invalid JSON: ${(e as Error).message}`;
      continue;
    }

    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
      return { data: parsed.data, cost, attempts: attempt + 1 };
    }
    lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }

  throw new Error(`completeJson: schema validation failed after ${maxRepairs + 1} attempts: ${lastError}`);
}
