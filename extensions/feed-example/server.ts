// The feed-example extension's server half: one home page order and no routes.
// Copy this directory to write your own; src/feeds/pace-layered.ts is the
// core order to start from if you want to change how items sink and climb.
import type { ServerExtension } from "../../src/extensions/server.ts";
import { pinsFirst } from "./feeds.ts";

export const server: ServerExtension = {
  name: "feed-example",
  routes() {},
  feeds: [pinsFirst],
};
