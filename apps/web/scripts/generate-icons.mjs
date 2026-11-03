import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const sourcePath = fileURLToPath(
  new URL("../public/app-icon.png", import.meta.url),
);

const outputDirectory = fileURLToPath(
  new URL("../public/icons/", import.meta.url),
);

const icons = [
  { filename: "icon-192-v3.png", size: 192 },
  { filename: "icon-512-v3.png", size: 512 },
  { filename: "apple-touch-icon-v3.png", size: 180 },
];

async function generateIcons() {
  await mkdir(outputDirectory, { recursive: true });

  const source = await readFile(sourcePath);

  await Promise.all(
    icons.map(async ({ filename, size }) => {
      const outputPath = fileURLToPath(
        new URL(`../public/icons/${filename}`, import.meta.url),
      );

      await sharp(source)
        .resize(size, size, { fit: "contain" })
        .flatten({ background: "#f5efdf" })
        .png()
        .toFile(outputPath);
    }),
  );

  console.log("QuestRealm retro icons generated.");
}

generateIcons().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exitCode = 1;
});
