# Formatting PR scope

This PR publishes the completed formatting implementation and its browser oracle suite. It does not claim complete mutation acceptance or zero remaining coverage gaps. The separate Compose load-error and Retry implementation remains outside this branch.

The suite has 18 entry files and 41 properties. Its browser drivers exercise formatting helpers and actual editor interactions. Independent models judge the recorded observations in Node. The package pin remains `97a4e7a`.

Recorded receiving evidence includes a 1,262-registration mixed baseline twice (876.2 and 878.2 seconds), 279 expanded WebKit native checks twice, 476 Chromium session/native checks twice, and 3,571 helper checks twice. Those receipts apply to their recorded source snapshots. They do not establish a complete run on a later merged head. See [receiving audit](receiving-audit-20261121.md), [focal sensitivity](focal-sensitivity-20261122.md), and [native boundary strengthening](native-boundary-strengthening-20261121.md).

The old `test-ui/links.test.ts` and `e2e/format-shortcuts.spec.ts` observations have loss mappings. The unit suite `test-ui/format-shortcuts.test.ts` and browser suite `e2e/markdown-structure.spec.ts` remain. No further legacy retirement is part of this PR.

The CI candidate partitions complete files and requires both unmutated passes plus a complete aggregate. Its first complete cold Linux execution and timing remain unverified. Full mutation campaigns and documented engine/framework classifications also remain incomplete. The PR stays draft while final-head integration and CI evidence are pending.

Research and design records describe their own historical snapshots. They do not expand this PR into the proposed smart-list, heading/quote, completed-placeholder, or native-host recovery features. The local feedback log and unfinished Compose continuation records stay uncommitted.
