import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

type VariantManifest = {
  source: string;
  importedAt: string;
  total: number;
  variants: Array<{ kim: string }>;
};

const SITES_VARIANT_LIMIT = 10;

async function copyCompactVariantData(root: string, publicOutput: string) {
  const sourceData = resolve(root, "public", "data");
  const sourceManifest = resolve(sourceData, "variant-manifest.json");
  if (!(await exists(sourceManifest))) return;

  const manifest = JSON.parse(await readFile(sourceManifest, "utf8")) as VariantManifest;
  const variants = manifest.variants.slice(0, SITES_VARIANT_LIMIT);
  const outputData = resolve(publicOutput, "data");
  const outputVariants = resolve(outputData, "variants");

  await rm(outputVariants, { recursive: true, force: true });
  await mkdir(outputVariants, { recursive: true });
  await Promise.all(variants.map(({ kim }) => cp(
    resolve(sourceData, "variants", `${kim}.json`),
    resolve(outputVariants, `${kim}.json`),
  )));
  await writeFile(resolve(outputData, "variant-manifest.json"), `${JSON.stringify({
    ...manifest,
    total: variants.length,
    variants,
  }, null, 2)}\n`);
}

// Packages Sites metadata and migrations after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, "dist", ".openai");
      const hostingConfig = resolve(root, ".openai", "hosting.json");
      const drizzleSource = resolve(root, "drizzle");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));
      }
      if (await exists(drizzleSource)) {
        await cp(drizzleSource, resolve(outputDirectory, "drizzle"), {
          recursive: true,
        });
      }

      // Sites is our lightweight development copy. Keep the full task bank, but
      // publish only a representative set of variants so releases stay compact.
      for (const publicOutput of [
        resolve(root, "dist", "client"),
        resolve(root, "dist", "standalone", "public"),
      ]) {
        if (await exists(publicOutput)) {
          await copyCompactVariantData(root, publicOutput);
        }
      }
    },
  };
}
