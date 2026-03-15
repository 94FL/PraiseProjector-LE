import localforage from "localforage";

/**
 * ImageStorage service - stores imported images in IndexedDB using localForage.
 * Images are stored as base64 data URLs for easy display.
 */

export interface StoredImage {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL
  width: number;
  height: number;
  size: number; // file size in bytes
  mimeType: string;
  dateAdded: number; // timestamp
}

// Configure localForage to use IndexedDB for images
const imageStorage = localforage.createInstance({
  name: "PraiseProjector",
  storeName: "images",
  description: "PraiseProjector background images storage",
});

/**
 * Generate a unique ID for an image
 */
function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get image dimensions from a data URL
 */
async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Convert a File to a base64 data URL
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Dispatch event to notify components that image storage has changed
 */
function dispatchImagesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pp-images-changed"));
  }
}

/**
 * Import an image file into storage
 */
export async function importImage(file: File): Promise<StoredImage> {
  try {
    const dataUrl = await fileToDataUrl(file);
    const dimensions = await getImageDimensions(dataUrl);

    const image: StoredImage = {
      id: generateImageId(),
      name: file.name,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
      size: file.size,
      mimeType: file.type,
      dateAdded: Date.now(),
    };

    await imageStorage.setItem(image.id, image);
    console.info("ImageStorage", `Imported image: ${image.name} (${image.id})`);

    dispatchImagesChanged();

    return image;
  } catch (error) {
    console.error("ImageStorage", `Failed to import image: ${file.name}`, error);
    throw error;
  }
}

/**
 * Import multiple image files into storage
 */
export async function importImages(files: FileList | File[]): Promise<StoredImage[]> {
  const images: StoredImage[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    // Only import image files
    if (file.type.startsWith("image/")) {
      try {
        const image = await importImage(file);
        images.push(image);
      } catch (error) {
        console.warn("ImageStorage", `Skipping file: ${file.name}`, error);
      }
    }
  }

  return images;
}

/**
 * Get all stored images
 */
export async function getAllImages(): Promise<StoredImage[]> {
  try {
    const images: StoredImage[] = [];
    await imageStorage.iterate<StoredImage, void>((value) => {
      images.push(value);
    });
    // Sort by date added (newest first)
    images.sort((a, b) => b.dateAdded - a.dateAdded);
    return images;
  } catch (error) {
    console.error("ImageStorage", "Failed to get all images", error);
    return [];
  }
}

/**
 * Get a single image by ID
 */
export async function getImage(id: string): Promise<StoredImage | null> {
  try {
    return await imageStorage.getItem<StoredImage>(id);
  } catch (error) {
    console.error("ImageStorage", `Failed to get image: ${id}`, error);
    return null;
  }
}

/**
 * Delete an image by ID
 */
export async function deleteImage(id: string): Promise<void> {
  try {
    await imageStorage.removeItem(id);
    console.info("ImageStorage", `Deleted image: ${id}`);
    dispatchImagesChanged();
  } catch (error) {
    console.error("ImageStorage", `Failed to delete image: ${id}`, error);
    throw error;
  }
}

/**
 * Delete multiple images by IDs
 */
export async function deleteImages(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteImage(id);
  }
}

/**
 * Clear all stored images
 */
export async function clearAllImages(): Promise<void> {
  try {
    await imageStorage.clear();
    console.info("ImageStorage", "Cleared all images");
    dispatchImagesChanged();
  } catch (error) {
    console.error("ImageStorage", "Failed to clear all images", error);
    throw error;
  }
}

/**
 * Get the total storage used by images (in bytes)
 */
export async function getStorageUsage(): Promise<number> {
  try {
    let totalSize = 0;
    await imageStorage.iterate<StoredImage, void>((value) => {
      totalSize += value.size;
    });
    return totalSize;
  } catch (error) {
    console.error("ImageStorage", "Failed to calculate storage usage", error);
    return 0;
  }
}

/**
 * Get count of stored images
 */
export async function getImageCount(): Promise<number> {
  try {
    return await imageStorage.length();
  } catch (error) {
    console.error("ImageStorage", "Failed to get image count", error);
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const imageStorageService = {
  importImage,
  importImages,
  getAllImages,
  getImage,
  deleteImage,
  deleteImages,
  clearAllImages,
  getStorageUsage,
  getImageCount,
  formatBytes,
};

export default imageStorageService;
