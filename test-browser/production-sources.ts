/** Non-asset queries intentionally pass through the gap runner's source loader.
 * The project transform turns its current served source into a string, so the
 * exact authored patch reaches esbuild and Chromium rather than only Node/Vite.
 */
import draft from '../src/ui/draft.ts?browser-source';
import authoring from '../src/ui/authoring.tsx?browser-source';
import pacedWrite from '../src/ui/paced-write.ts?browser-source';
import search from '../src/ui/search.tsx?browser-source';
import cursorQuery from '../src/ui/cursor-query.ts?browser-source';
export const browserSources: Readonly<Record<string, string>> = {
  'src/ui/draft.ts': draft,
  'src/ui/authoring.tsx': authoring,
  'src/ui/paced-write.ts': pacedWrite,
  'src/ui/search.tsx': search,
  'src/ui/cursor-query.ts': cursorQuery,
};
