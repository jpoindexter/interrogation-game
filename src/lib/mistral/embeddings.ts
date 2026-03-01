import { mistralClient } from './client';

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await mistralClient.embeddings.create({
    model: 'mistral-embed',
    inputs: texts,
  });
  return res.data.map((d) => d.embedding as number[]);
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec;
}
