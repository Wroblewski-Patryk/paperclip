import { build } from "esbuild";

const common = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "external",
  sourcemap: true,
};

await Promise.all([
  build({
    ...common,
    entryPoints: ["src/worker.ts"],
    outfile: "dist/worker.js",
  }),
  build({
    ...common,
    entryPoints: ["src/manifest.ts"],
    outfile: "dist/manifest.js",
  }),
]);
