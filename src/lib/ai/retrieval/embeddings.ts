import { AiError } from '../contracts';
import { EMBEDDING_SPACE, requireRetrievalConfig } from './config';
import { reserveAiWorkAsync } from '../../limits/ai-scope';

interface EmbeddingRow { index: number; embedding: number[] }
function parseEmbeddings(raw: { model?: unknown; data?: EmbeddingRow[] }, count: number): number[][] {
  if (raw.model !== EMBEDDING_SPACE.model || !Array.isArray(raw.data) || raw.data.length !== count) {
    throw new AiError('EMBEDDING_INVALID', 'The embedding response did not match the configured space.');
  }
  const rows = [...raw.data].sort((a, b) => a.index - b.index);
  return rows.map((row, index) => {
    if (row.index !== index || !Array.isArray(row.embedding) || row.embedding.length !== EMBEDDING_SPACE.dimensions
      || !row.embedding.every(value => typeof value === 'number' && Number.isFinite(value))) {
      throw new AiError('EMBEDDING_INVALID', 'The embedding response contained an invalid vector.');
    }
    return row.embedding;
  });
}

export async function embedTexts(texts: string[], options: { env?: Record<string, string | undefined>; fetcher?: typeof fetch; signal?: AbortSignal } = {}): Promise<number[][]> {
  options.signal?.throwIfAborted();
  const config = requireRetrievalConfig(options.env);
  if (!texts.length) return [];
  if (texts.length > 32 || texts.some(text => !text.trim() || text.length > 12000)) {
    throw new AiError('EMBEDDING_INPUT', 'Embedding input must contain 1–32 nonempty texts of at most 12000 characters.');
  }
  await reserveAiWorkAsync({ instructions: '', input: JSON.stringify(texts), schema: {} });
  const response = await (options.fetcher ?? fetch)('https://api.openai.com/v1/embeddings', {
    method: 'POST', signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, dimensions: config.dimensions, encoding_format: 'float', input: texts }),
  });
  if (!response.ok) throw new AiError('EMBEDDING_FAILED', `Embedding request failed (HTTP ${response.status}).`);
  return parseEmbeddings(await response.json(), texts.length);
}
