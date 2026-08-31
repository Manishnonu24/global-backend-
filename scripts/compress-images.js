const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

const FILES_TO_CONVERT = [
  "background.png",
  "bg.png",
  "ayurveda.png",
  "disease.png",
  "holistic.png",
  "hero_exercise.png",
];

async function run() {
  console.log("⚡ Starting image compression and conversion to WebP...");
  for (const filename of FILES_TO_CONVERT) {
    const inputPath = path.join(IMAGES_DIR, filename);
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️ Skip: ${filename} does not exist.`);
      continue;
    }

    const basename = path.parse(filename).name;
    const outputPath = path.join(IMAGES_DIR, `${basename}.webp`);

    try {
      const originalSize = fs.statSync(inputPath).size;
      
      // Convert to WebP with 75% quality and resize large images if needed
      let transformer = sharp(inputPath);
      
      if (basename.includes("background") || basename === "bg") {
        // Resize background images to max 1920px width to reduce resolution waste
        transformer = transformer.resize(1920, null, { withoutEnlargement: true });
      }

      await transformer
        .webp({ quality: 75, effort: 6 })
        .toFile(outputPath);

      const newSize = fs.statSync(outputPath).size;
      const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);
      
      console.log(`✅ Converted ${filename} (${(originalSize / 1024 / 1024).toFixed(2)} MB) ➡️ ${basename}.webp (${(newSize / 1024).toFixed(1)} KB) | Size Reduced by ${reduction}%`);
    } catch (err) {
      console.error(`❌ Error converting ${filename}:`, err.message);
    }
  }
  console.log("🎉 Image optimization completed!");
}

run();
