export function extractBetween(str: string, start: string, end: string): string | undefined {
  const startIndex = str.indexOf(start);
  if (startIndex === -1) return undefined;

  const contentStart = startIndex + start.length;
  const endIndex = str.indexOf(end, contentStart);
  
  if (endIndex === -1) return undefined;
  
  return str.substring(contentStart, endIndex);
}
