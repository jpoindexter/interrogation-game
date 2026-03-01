import { Mistral } from '@mistralai/mistralai';

export const mistralClient = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

export function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk: { type?: string; text?: string }) =>
        chunk.type === 'text' ? chunk.text ?? '' : ''
      )
      .join('');
  }
  return '';
}
