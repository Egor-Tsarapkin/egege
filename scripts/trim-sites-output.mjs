import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const canonicalClient = resolve(root, "dist", "client");
const generatedPublicCopies = [
  resolve(root, "dist", "standalone", "public"),
  resolve(root, "dist", "standalone", "dist", "client"),
];
const productionOnlyMedia = ["database-gifs", "theme-gifs", "materials/kege/imported"];

for (const publicOutput of [canonicalClient, ...generatedPublicCopies]) {
  await Promise.all(productionOnlyMedia.map((relativePath) => rm(
    resolve(publicOutput, relativePath),
    { recursive: true, force: true },
  )));
}

for (const publicOutput of generatedPublicCopies) {
  await rm(resolve(publicOutput, "data", "variants"), { recursive: true, force: true });
  await cp(
    resolve(canonicalClient, "data", "variants"),
    resolve(publicOutput, "data", "variants"),
    { recursive: true },
  );
  await cp(
    resolve(canonicalClient, "data", "variant-manifest.json"),
    resolve(publicOutput, "data", "variant-manifest.json"),
  );
}
