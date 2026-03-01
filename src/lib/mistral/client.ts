import { Mistral } from '@mistralai/mistralai';

export const mistralClient = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

/** Return a Mistral client — user-keyed if provided, otherwise the default singleton. */
export function getClient(apiKey?: string): Mistral {
  return apiKey ? new Mistral({ apiKey }) : mistralClient;
}

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
