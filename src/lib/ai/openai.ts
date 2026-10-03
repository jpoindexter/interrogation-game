import { ensureNotAborted, executionSignal } from './execution';
import { AiError, type AiProvider, type StructuredTask } from './contracts';

export class OpenAIProvider implements AiProvider {
  constructor(private readonly options: { apiKey: string; model: string; timeoutMs: number; fetcher?: typeof fetch }) {}

  async generate(task: StructuredTask): Promise<Record<string, unknown>> {
    ensureNotAborted(task.signal);
    if (!this.options.apiKey) throw new AiError('KEY_REQUIRED', 'Configure OPENAI_API_KEY on the server to use the OpenAI API.');
    const signal = executionSignal(task.signal, this.options.timeoutMs);
    const response = await (this.options.fetcher ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST', signal, headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.options.model, store: false, tools: [], tool_choice: 'none',
        reasoning: { effort: 'low' }, input: [{ role: 'system', content: task.instructions }, { role: 'user', content: task.input }],
        text: { format: { type: 'json_schema', name: `interrogation_${task.capability}`, strict: true, schema: task.schema } } }),
    });
    if (!response.ok) throw new AiError('API_FAILED', `OpenAI could not complete this request (HTTP ${response.status}).`);
    const data = await response.json();
    ensureNotAborted(signal);
    return parseResponse(data);
  }
}

function parseResponse(data: { status?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] }): Record<string, unknown> {
  if (data.status !== 'completed' || !Array.isArray(data.output)) throw new AiError('API_INCOMPLETE', 'The OpenAI response was incomplete. Retry the request.');
  const content = data.output.filter(item => item.type === 'message').flatMap(item => item.content ?? []);
  if (content.some(item => item.type === 'refusal')) throw new AiError('REFUSED', 'The AI could not answer this request. Try rephrasing.');
  const text = content.filter(item => item.type === 'output_text').map(item => item.text ?? '').join('');
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AiError('INVALID_RESPONSE', 'The response was not a JSON object.');
  return parsed;
}
