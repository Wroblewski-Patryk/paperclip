import fs from "node:fs";
import path from "node:path";

function toGlobstarPath(candidate: string): string {
  return `${candidate.replaceAll(path.sep, "/")}/**`;
}

function addIgnorePath(target: Set<string>, candidate: string): void {
  target.add(candidate);
  target.add(toGlobstarPath(candidate));
  try {
    const realPath = fs.realpathSync(candidate);
    target.add(realPath);
    target.add(toGlobstarPath(realPath));
  } catch {
    // Ignore paths that do not exist in the current checkout.
  }
}

function addHomeRelativeIgnorePath(target: Set<string>, relativePath: string): void {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return;
  addIgnorePath(target, path.join(home, relativePath));
}

export function resolveServerDevWatchIgnorePaths(serverRoot: string): string[] {
  const ignorePaths = new Set<string>([
    "**/{node_modules,bower_components,vendor}/**",
    "**/.vite-temp/**",
    "**/{dist,coverage}/**",
    "**/.turbo/**",
  ]);

  for (const relativePath of [
    "../ui/node_modules",
    "../ui/node_modules/.vite-temp",
    "../ui/.vite",
    "../ui/dist",
  ]) {
    addIgnorePath(ignorePaths, path.resolve(serverRoot, relativePath));
  }
  // npm install during reinstall would trigger a restart mid-request if tsx
  // watch sees the new files. Exclude the managed plugins dir.
  addHomeRelativeIgnorePath(ignorePaths, path.join(".paperclip", "adapter-plugins"));

  return [...ignorePaths];
}
