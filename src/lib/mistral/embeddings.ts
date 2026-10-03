import { embedTexts } from '../ai/retrieval/embeddings';

/** Transitional import facade. Credentials and embedding space are server configured. */
export async function embed(texts: string[], legacyApiKey?: string): Promise<number[][]> {
  void legacyApiKey;
  return embedTexts(texts);
}
export async function embedOne(text: string, legacyApiKey?: string): Promise<number[]> {
  const [vector] = await embed([text], legacyApiKey);
  return vector;
}
