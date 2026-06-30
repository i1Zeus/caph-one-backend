import * as sharp from 'sharp';

/**
 * Compresses an image buffer to JPEG format
 * @param imageBuffer - The original image buffer
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param quality - JPEG quality 1-100 (default: 60)
 * @returns Compressed image buffer
 */
export async function compressImage(
  imageBuffer: Buffer,
  maxWidth: number = 1920,
  quality: number = 60,
): Promise<Buffer> {
  try {
    // Get image metadata to check dimensions
    const metadata = await sharp(imageBuffer).metadata();

    // Only resize if image is wider than maxWidth
    const shouldResize = metadata.width && metadata.width > maxWidth;

    // Build sharp pipeline
    let pipeline = sharp(imageBuffer);

    if (shouldResize) {
      pipeline = pipeline.resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to JPEG and compress
    const compressedBuffer = await pipeline
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    return compressedBuffer;
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`);
  }
}

/**
 * Validates if the provided buffer is a valid image
 * @param imageBuffer - The image buffer to validate
 * @returns True if valid image, false otherwise
 */
export async function isValidImage(imageBuffer: Buffer): Promise<boolean> {
  try {
    await sharp(imageBuffer).metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets image dimensions
 * @param imageBuffer - The image buffer
 * @returns Object with width and height
 */
export async function getImageDimensions(
  imageBuffer: Buffer,
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}
