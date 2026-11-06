import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const sourcePath = fileURLToPath(
  new URL("../public/app-icon.svg", import.meta.url),
);

const outputDirectory = fileURLToPath(
  new URL("../public/icons/", import.meta.url),
);

const icons = [
  { filename: "icon-192-v4.png", size: 192 },
  { filename: "icon-512-v4.png", size: 512 },
  { filename: "apple-touch-icon-v4.png", size: 180 },
  { filename: "icon-maskable-v4.png", size: 512 },
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
        .flatten({ background: "#3d6242" })
        .png()
        .toFile(outputPath);
    }),
  );

  await sharp(source).resize(512, 512).png().toFile(fileURLToPath(new URL("../public/app-icon.png", import.meta.url)));

  console.log("QuestRealm vector icons generated.");
}

generateIcons().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exitCode = 1;
});
