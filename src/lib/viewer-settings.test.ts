import { expect, it } from 'vitest';
import { toggleHighlight, effectiveColumns, blockName, canRenamePlaylist } from './viewer-settings';
it('adds and removes a viewer highlight independently of song content', () => {
 expect(toggleHighlight([], 2)).toEqual([2]); expect(toggleHighlight([2, 4], 2)).toEqual([4]);
});
it('allows up to two columns on phones when dividers are off', () => {
 expect(effectiveColumns(3, true, false, 'C G')).toBe(2);
 expect(effectiveColumns(2, true, false, '--- [Refrão] ---')).toBe(2);
 expect(effectiveColumns(2, true, true, '--- [Refrão] ---')).toBe(1);
});
it('does not combine block dividers with multiple columns', () => {
 expect(effectiveColumns(2, false, true, '--- [Refrão] ---')).toBe(1);
 expect(effectiveColumns(2, false, false, '--- [Refrão] ---')).toBe(2);
});
it('keeps the editable block name', () => { expect(blockName('--- [Final] ---')).toBe('Final'); });
it('allows only the inviting owner to rename', () => {
 expect(canRenamePlaylist('owner', 'owner')).toBe(true); expect(canRenamePlaylist('owner', 'participant')).toBe(false);
});
import { sectionLines, resolveReturnLine, readReturnPoints, toggleReturnPoint, resolveReturnPoints } from './viewer-settings';
it('adds and removes return points in line order', () => {
 expect(toggleReturnPoint([], 5)).toEqual([5]);
 expect(toggleReturnPoint([5], 2)).toEqual([2, 5]);
 expect(toggleReturnPoint([2, 5], 5)).toEqual([2]);
});
it('reads only valid return points', () => {
 expect(readReturnPoints([1, 'x', -2, 3])).toEqual([1, 3]);
 expect(readReturnPoints(null)).toEqual([]);
});
it('drops return points that no longer exist, keeping order', () => {
 const content = '[Intro]\nC G\n[Refrão]\nletra';
 expect(resolveReturnPoints([2, 0], content)).toEqual([2, 0]);
 expect(resolveReturnPoints([9, 2], content)).toEqual([2]);
 expect(resolveReturnPoints([9], content)).toEqual([]);
});
it('lists sections and blocks as return points', () => {
 expect(sectionLines('[Intro]\nC G\n--- [Refrão] ---\nletra')).toEqual([{ line: 0, name: 'Intro' }, { line: 2, name: 'Refrão' }]);
});
it('falls back to the start when the saved return point no longer exists', () => {
 expect(resolveReturnLine(2, '[Intro]\nC\n[Refrão]')).toBe(2);
 expect(resolveReturnLine(1, '[Intro]\nC\n[Refrão]')).toBe(0);
 expect(resolveReturnLine(null, '[Intro]')).toBe(0);
});
