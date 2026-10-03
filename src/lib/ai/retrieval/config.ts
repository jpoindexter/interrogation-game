import { AiError } from '../contracts';

export const PATTERN_SCHEMA_VERSION = 'accepted-events-v1' as const;
export const EMBEDDING_SPACE = {
  model: 'text-embedding-3-small', dimensions: 1536,
  version: 'openai-text-embedding-3-small-1536-events-v2',
} as const;

export function retrievalEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AI_RAG_ENABLED === 'true';
}

export function requireRetrievalConfig(env: Record<string, string | undefined> = process.env) {
  if (!retrievalEnabled(env)) throw new AiError('RAG_DISABLED', 'Historical retrieval is disabled.');
  if (env.RAG_EMBEDDING_VERSION !== EMBEDDING_SPACE.version) {
    throw new AiError('RAG_VERSION_REQUIRED', 'Apply the versioned patterns migration and configure RAG_EMBEDDING_VERSION.');
  }
  if (!env.OPENAI_API_KEY) throw new AiError('KEY_REQUIRED', 'Historical retrieval requires a server OPENAI_API_KEY.');
  return { ...EMBEDDING_SPACE, apiKey: env.OPENAI_API_KEY };
}
