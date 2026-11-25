import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Partition = { id: string; files: string[] };
// Shard counts affect assignment. Each registration keeps its name and seed.
const timings: Record<string, { seconds: number; shards?: number }> = {
  mixed: { seconds: 540, shards: 11 },
  receivers: { seconds: 325, shards: 4 },
  interactions: { seconds: 320, shards: 3 },
  session: { seconds: 310, shards: 3 },
  workflows: { seconds: 310, shards: 3 },
  'held-newline': { seconds: 400, shards: 3 },
  'newline-history': { seconds: 490, shards: 2 },
  navigation: { seconds: 210, shards: 3 },
  'bracket-receiver': { seconds: 235 },
  'code-block': { seconds: 185 },
  draft: { seconds: 35 },
  'escape-layers': { seconds: 255 },
  inline: { seconds: 135 },
  keyboard: { seconds: 260 },
  'line-break': { seconds: 105 },
  links: { seconds: 135 },
  list: { seconds: 215 },
  'valid-input': { seconds: 60 },
};
// Each row is one runner with two CPU lanes. Five hosted timing profiles
// balance the long groups and leave two short groups to free runners early.
const compactLanes = [
  [['held-newline-1', 'workflows-2'], ['session-1', 'escape-layers']],
  [['mixed-2', 'line-break'], ['newline-history-1', 'links']],
  [['keyboard', 'session-2'], ['held-newline-3', 'list']],
  [['navigation-1', 'receivers-2'], ['mixed-7', 'valid-input']],
  [['receivers-4', 'navigation-2'], ['session-3', 'bracket-receiver']],
  [['mixed-6'], ['mixed-1']],
  [['navigation-3', 'workflows-3'], ['receivers-1', 'code-block']],
  [['mixed-3'], ['mixed-4']],
  [['mixed-8'], ['mixed-11']],
  [['mixed-5'], ['mixed-10']],
  [['held-newline-2', 'inline'], ['mixed-9']],
  [['newline-history-2'], ['interactions-2', 'draft']],
  [['workflows-1'], ['interactions-3']],
  [['receivers-3'], ['interactions-1']],
] as const;
export const fileId = (file: string) => file.replace(/^test-ui\/editor-/, '').replace(/\.oracle\.test\.ts$/, '');
export const shardCount = (file: string) => timings[fileId(file)]?.shards ?? 1;
const partitionSeconds = (part: Partition) => timings[fileId(part.files[0]!)]?.seconds ?? 300;
const matrixJob = (first: readonly string[], companion: readonly string[] = []) => ({
  id: first[0]!, companion: companion[0] ?? '', followup: first[1] ?? '', companionFollowup: companion[1] ?? '',
});

export function groupBaselinePartitions(parts: readonly Partition[], compact = false) {
  if (compact) {
    const scheduled = new Set<string>(compactLanes.flat(2));
    if (scheduled.size === parts.length && parts.every(part => scheduled.has(part.id))) {
      return compactLanes.map(([first, companion]) => matrixJob(first, companion));
    }
  }
  // Pack any new partition roster by estimated duration.
  const runners = Math.max(1, Math.round(parts.length * (compact ? 2 / 7 : 3 / 8)));
  const lanes = Array.from({ length: runners * 2 }, () => ({ parts: [] as string[], seconds: 0 }));
  for (const part of [...parts].sort((left, right) => partitionSeconds(right) - partitionSeconds(left))) {
    const lane = lanes.filter(current => current.parts.length < 2)
      .reduce((least, current) => current.seconds < least.seconds ? current : least);
    lane.parts.push(part.id);
    lane.seconds += partitionSeconds(part);
  }
  // Pair lanes of similar length to minimize the time a runner sits half idle.
  const active = lanes.filter(lane => lane.parts.length).sort((left, right) => right.seconds - left.seconds);
  const groups = [];
  for (let index = 0; index < active.length; index += 2) {
    groups.push(matrixJob(active[index]!.parts, active[index + 1]?.parts));
  }
  // In runs 45443078812 and 45453300660, interactions-1 and inline
  // together took about two minutes longer than their mixed-11 companion.
  const mixed = groups.find(group => group.id === 'mixed-11' && group.companion === 'interactions-1');
  const newline = groups.find(group => group.id === 'newline-history-2' && group.companion === 'workflows-1');
  if (!compact && mixed?.companionFollowup === 'inline' && newline?.followup === '') {
    newline.followup = mixed.companionFollowup;
    mixed.companionFollowup = '';
  }
  return groups;
}

// The planner still checks the registry and collects the full test roster.
export function baselineFiles(root: string) {
  return readdirSync(resolve(root, 'test-ui')).filter(file => /^editor-.*\.oracle\.test\.ts$/.test(file)).map(file => 'test-ui/' + file).sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error('Schedule command requires GitHub output ownership');
  const partitions = baselineFiles(process.cwd()).flatMap(file =>
    Array.from({ length: shardCount(file) }, (_, shard) => ({
      id: shardCount(file) === 1 ? fileId(file) : `${fileId(file)}-${shard + 1}`,
      files: [file],
    })),
  );
  const include = groupBaselinePartitions(partitions, process.env.FORMATTING_COMPACT === 'true');
  writeFileSync(output, 'matrix=' + JSON.stringify({ include }) + '\n', { flag: 'a' });
}
