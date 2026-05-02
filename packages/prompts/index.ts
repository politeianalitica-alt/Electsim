/**
 * packages/prompts — Loader TypeScript para el catálogo de prompts ElectSim.
 *
 * Uso:
 *   import { loadPrompt, renderPrompt } from '@electsim/prompts';
 *   const tpl = await loadPrompt('intelligence.morning_briefing');
 *   const text = renderPrompt(tpl, { date: '2026-05-01', ... });
 */

export interface PromptInput {
  name: string;
  type: 'string' | 'number' | 'array' | 'object' | 'boolean';
  description: string;
}

export interface PromptTemplate {
  id: string;
  version: string;
  model: string;
  taskType: string;
  inputs: PromptInput[];
  outputSchema: Record<string, unknown>;
  template: string;
}

export class PromptNotFoundError extends Error {
  constructor(promptId: string) {
    super(`Prompt not found: ${promptId}`);
    this.name = 'PromptNotFoundError';
  }
}

/** Catálogo de IDs disponibles (actualizar al añadir prompts) */
export const PROMPT_IDS = [
  'intelligence.morning_briefing',
  'intelligence.risk_memo',
  'intelligence.narrative_labeling',
  'intelligence.impact_assessment',
  'comms.crisis_response_kit',
  'comms.actor_briefing',
  'legislative.regulatory_impact',
  'electoral.scenario_analysis',
] as const;

export type PromptId = (typeof PROMPT_IDS)[number];

/**
 * Renderiza un template sustituyendo variables {{ var }}.
 * En producción usar una librería Jinja2-compatible (nunjucks).
 */
export function renderPrompt(
  template: PromptTemplate,
  vars: Record<string, unknown>
): string {
  return template.template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : `{{ ${key} }}`;
  });
}
