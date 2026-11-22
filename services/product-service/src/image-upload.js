import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const imageTypes = {
  "image/jpeg": {
    extension: "jpg",
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  "image/webp": {
    extension: "webp",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
};

export class ImageUploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new ImageUploadError("Choose a JPG, PNG, or WEBP image."));
      return;
    }
    callback(null, true);
  },
});

export function validateImageFile(file) {
  if (
    !file ||
    !allowedImageTypes.has(file.mimetype) ||
    !Buffer.isBuffer(file.buffer)
  ) {
    throw new ImageUploadError("Choose a JPG, PNG, or WEBP image.");
  }
  if (!Number.isSafeInteger(file.size) || file.size !== file.buffer.length) {
    throw new ImageUploadError("The selected image file is invalid.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageUploadError("Image must be 5 MB or smaller.", 413);
  }
  if (!imageTypes[file.mimetype].matches(file.buffer)) {
    throw new ImageUploadError(
      "The selected file is not a valid JPG, PNG, or WEBP image.",
    );
  }
}

export async function saveUploadedImage(file, uploadDirectory) {
  validateImageFile(file);
  await mkdir(uploadDirectory, { recursive: true });

  const { extension } = imageTypes[file.mimetype];
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory, filename), file.buffer, {
    flag: "wx",
  });
  return filename;
}

export function imageStaticMiddleware(uploadDirectory) {
  return express.static(uploadDirectory, {
    dotfiles: "deny",
    fallthrough: false,
    index: false,
    redirect: false,
    setHeaders(response) {
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      response.setHeader("X-Content-Type-Options", "nosniff");
    },
  });
}
