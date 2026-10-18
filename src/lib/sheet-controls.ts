export function adjustBpm(bpm: number, change: number) {
  return Math.max(0, Math.min(300, bpm + change));
}
