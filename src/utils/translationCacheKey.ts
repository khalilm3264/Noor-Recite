export function translationContentKey(sourceText: string, arabicContext?: string): string {
  return JSON.stringify([sourceText.trim(), arabicContext?.trim() ?? '']);
}
