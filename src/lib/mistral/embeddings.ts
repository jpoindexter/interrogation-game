import { getClient } from './client';

export async function embed(texts: string[], apiKey?: string): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getClient(apiKey).embeddings.create({
    model: 'mistral-embed',
    inputs: texts,
  });
  return res.data.map((d) => d.embedding as number[]);
}

export async function embedOne(text: string, apiKey?: string): Promise<number[]> {
  const [vec] = await embed([text], apiKey);
  return vec;
}
