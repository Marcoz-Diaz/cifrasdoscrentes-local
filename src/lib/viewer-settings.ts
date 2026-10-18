export type Highlight = number;
export function toggleHighlight(lines: number[], line: number): number[] {
  return lines.includes(line) ? lines.filter((n) => n !== line) : [...lines, line].sort((a, b) => a - b);
}
export function readHighlights(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0) : [];
}
export function blockName(line: string): string | null {
  const match = line.match(/^\s*---\s*\[(.*?)\]\s*---\s*$/);
  return match?.[1] ?? null;
}
/** Active block dividers force one column; otherwise phones allow up to 2 columns. */
export function effectiveColumns(columns: number, mobile: boolean, dividers: boolean, content: string): number {
  if (dividers && content.split('\n').some((line) => blockName(line) !== null)) return 1;
  return mobile ? Math.min(columns, 2) : columns;
}
export function canRenamePlaylist(ownerId: string, userId: string): boolean { return ownerId === userId; }
export interface SectionPoint { line: number; name: string }
/** Lines the "return" button can jump to: block dividers and [Section] titles. */
export function sectionLines(content: string): SectionPoint[] {
  return content.split('\n').flatMap((line, i) => {
    const block = blockName(line);
    if (block !== null) return [{ line: i, name: block || 'Bloco' }];
    const m = line.trim().match(/^\[([^\]]+)\]$/);
    return m?.[1] ? [{ line: i, name: m[1] }] : [];
  });
}
/** Saved return point if it still exists, otherwise the start of the song (line 0). */
export function resolveReturnLine(saved: number | null | undefined, content: string): number {
  return saved != null && sectionLines(content).some((s) => s.line === saved) ? saved : 0;
}
/** Parses a saved list of return points (source line numbers). */
export function readReturnPoints(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0) : [];
}
/** Adds or removes a return point, keeping the list sorted by line. */
export function toggleReturnPoint(points: number[], line: number): number[] {
  return points.includes(line) ? points.filter((n) => n !== line) : [...points, line].sort((a, b) => a - b);
}
/** Return points that still exist in the content, keeping their order. */
export function resolveReturnPoints(points: number[], content: string): number[] {
  const valid = new Set(sectionLines(content).map((s) => s.line));
  return points.filter((line) => valid.has(line) || line === 0);
}
