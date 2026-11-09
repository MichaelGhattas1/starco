const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const NAME = /\.(jpe?g|png|webp)$/i;
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_EDGE = 480;
const MAX_EDGE = 4096;

export const PHOTO_RULES =
  'Use a JPEG, PNG, or WebP. The shorter side must be at least 480 pixels, the longer side at most 4096, and the file 5 MB or less.';

export async function photoProblem(file: File): Promise<string | null> {
  return imageProblem(file, MIN_EDGE);
}

export async function firstPhotoProblem(files: File[]): Promise<string | null> {
  return firstImageProblem(files, MIN_EDGE);
}

export async function firstLogoProblem(files: File[]): Promise<string | null> {
  return firstImageProblem(files, 0);
}

async function firstImageProblem(files: File[], minimumEdge: number): Promise<string | null> {
  for (const file of files) {
    const problem = await imageProblem(file, minimumEdge);
    if (problem) {
      return problem;
    }
  }
  return null;
}

async function imageProblem(file: File, minimumEdge: number): Promise<string | null> {
  if (!TYPES.has(file.type) && !NAME.test(file.name)) {
    return `${file.name} is not a JPEG, PNG, or WebP photo.`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name} is larger than 5 MB.`;
  }
  const size = await readSize(file);
  if (!size) {
    return `${file.name} could not be read as a photo.`;
  }
  const shortest = Math.min(size.width, size.height);
  const longest = Math.max(size.width, size.height);
  if (shortest < minimumEdge) {
    return `${file.name} is too small. The shorter side must be at least ${minimumEdge} pixels.`;
  }
  if (longest > MAX_EDGE) {
    return `${file.name} is too large. The longer side must be ${MAX_EDGE} pixels or less.`;
  }
  return null;
}

function readSize(file: File): Promise<{ width: number; height: number } | null> {
  return createImageBitmap(file)
    .then((bitmap) => {
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    })
    .catch(() => null);
}
