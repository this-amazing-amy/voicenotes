import { execSync } from "child_process";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const EXTERNALS = [
  "dotenv",
  "fluent-ffmpeg",
  "@xenova/transformers",
  "wavefile",
];

const isProd = process.env.NODE_ENV === "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, "out");
const outputFile = path.join(outputDir, "main.js");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Bundle the application
const bundleApp = () =>
  esbuild
    .build({
      entryPoints: ["./dist/main.js"],
      bundle: true,
      platform: "node",
      target: "node16",
      outfile: outputFile,
      format: "esm",
      banner: {
        js: "#!/usr/bin/env node\n",
      },
      minify: isProd,
      treeShaking: false,
      packages: "external",
      external: EXTERNALS,
      metafile: true,
      logLevel: "info",
    })
    .then((result) => {
      execSync(`chmod +x ${outputFile}`);

      const bundleSize = Object.values(result.metafile.outputs).reduce(
        (total, output) => total + output.bytes,
        0
      );
      console.log(`Bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Bundle written to: ${outputFile}`);
    });

bundleApp();
