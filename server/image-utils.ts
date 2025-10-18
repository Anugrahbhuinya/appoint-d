import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NudgeOptions {
  dx?: number;
  dy?: number;
}

/**
 * Crop and nudge an uploaded image, then save it to the uploads directory.
 * @param inputPath Path to the uploaded file
 * @param outputPath Path to save the processed image
 * @param crop Crop options: { x, y, width, height }
 * @param nudge Nudge options: { dx, dy }
 * @returns The output file path
 */
export async function processProfileImage(
  inputPath: string,
  outputPath: string,
  crop: CropOptions,
  nudge?: NudgeOptions
): Promise<string> {
  let image = sharp(inputPath);
  if (crop && crop.width && crop.height) {
    image = image.extract({
      left: Math.max(0, crop.x + (nudge?.dx || 0)),
      top: Math.max(0, crop.y + (nudge?.dy || 0)),
      width: crop.width,
      height: crop.height,
    });
  }
  image = image.resize(256, 256).jpeg({ quality: 90 });
  await image.toFile(outputPath);
  await fs.unlink(inputPath);
  return outputPath;
}
