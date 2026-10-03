export function renderText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Missing prompt value: ${key}`);
    return String(values[key]);
  });
}
