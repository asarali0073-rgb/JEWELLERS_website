import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import express from "express";
import {
  allowedImageTypes,
  imageStaticMiddleware,
  ImageUploadError,
  imageUpload,
  MAX_IMAGE_SIZE_BYTES,
  saveUploadedImage,
  validateImageFile,
} from "../src/image-upload.js";

const imageSamples = [
  {
    type: "image/jpeg",
    extension: "jpg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  },
  {
    type: "image/png",
    extension: "png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    type: "image/webp",
    extension: "webp",
    buffer: Buffer.from("RIFF0000WEBP", "ascii"),
  },
];

test("accepts supported image types only when their signatures match", () => {
  assert.deepEqual([...allowedImageTypes].sort(), [
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  for (const sample of imageSamples) {
    assert.doesNotThrow(() =>
      validateImageFile({
        mimetype: sample.type,
        size: sample.buffer.length,
        buffer: sample.buffer,
      }),
    );
  }
  assert.throws(
    () =>
      validateImageFile({
        mimetype: "image/png",
        size: imageSamples[0].buffer.length,
        buffer: imageSamples[0].buffer,
      }),
    ImageUploadError,
  );
  assert.throws(
    () =>
      validateImageFile({
        mimetype: "image/svg+xml",
        size: 20,
        buffer: Buffer.from("<svg/>"),
      }),
    ImageUploadError,
  );
  assert.throws(
    () => validateImageFile({ mimetype: "image/png", size: 8 }),
    ImageUploadError,
  );
});

test("rejects images larger than the upload limit", () => {
  assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024);
  const buffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1);
  buffer.set([0xff, 0xd8, 0xff]);
  assert.throws(
    () =>
      validateImageFile({
        mimetype: "image/jpeg",
        size: buffer.length,
        buffer,
      }),
    (error) => error instanceof ImageUploadError && error.statusCode === 413,
  );
});

test("stores validated images under unique generated filenames", async (t) => {
  const uploadDirectory = await mkdtemp(
    path.join(os.tmpdir(), "amir-product-images-"),
  );
  t.after(() => rm(uploadDirectory, { recursive: true, force: true }));

  const sample = imageSamples[0];
  const file = {
    originalname: "..\\unsafe-name.jpg",
    mimetype: sample.type,
    size: sample.buffer.length,
    buffer: sample.buffer,
  };
  const firstFilename = await saveUploadedImage(file, uploadDirectory);
  const secondFilename = await saveUploadedImage(file, uploadDirectory);

  assert.match(firstFilename, /^[0-9a-f-]{36}\.jpg$/i);
  assert.notEqual(firstFilename, secondFilename);
  assert.deepEqual(
    await readFile(path.join(uploadDirectory, firstFilename)),
    sample.buffer,
  );
});

test("accepts multipart image uploads through the configured Multer middleware", async (t) => {
  const uploadDirectory = await mkdtemp(
    path.join(os.tmpdir(), "amir-product-multipart-"),
  );
  t.after(() => rm(uploadDirectory, { recursive: true, force: true }));

  const app = express();
  app.post("/upload", imageUpload.single("image"), (request, response, next) => {
    try {
      validateImageFile(request.file);
      saveUploadedImage(request.file, uploadDirectory).then(
        (filename) => response.status(201).json({ filename }),
        next,
      );
    } catch (error) {
      next(error);
    }
  });
  app.use((error, _request, response, _next) => {
    response.status(error.statusCode || 500).json({ message: error.message });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address();
  const image = imageSamples[2];
  const formData = new FormData();
  formData.append("image", new Blob([image.buffer], { type: image.type }), "gallery.webp");
  const response = await fetch(
    `http://127.0.0.1:${address.port}/upload`,
    { method: "POST", body: formData },
  );
  assert.equal(response.status, 201);
  const { filename } = await response.json();
  assert.match(filename, /^[0-9a-f-]{36}\.webp$/i);
  assert.deepEqual(await readFile(path.join(uploadDirectory, filename)), image.buffer);

  const invalidForm = new FormData();
  invalidForm.append("image", new Blob(["not an image"], { type: "text/plain" }), "photo.txt");
  const invalidResponse = await fetch(
    `http://127.0.0.1:${address.port}/upload`,
    { method: "POST", body: invalidForm },
  );
  assert.equal(invalidResponse.status, 400);
});

test("serves saved images from a fixed static directory", async (t) => {
  const uploadDirectory = await mkdtemp(
    path.join(os.tmpdir(), "amir-product-static-"),
  );
  t.after(() => rm(uploadDirectory, { recursive: true, force: true }));

  const sample = imageSamples[1];
  const filename = await saveUploadedImage(
    {
      mimetype: sample.type,
      size: sample.buffer.length,
      buffer: sample.buffer,
    },
    uploadDirectory,
  );
  const app = express();
  app.use("/uploads", imageStaticMiddleware(uploadDirectory));
  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).end();
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );

  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/uploads/${filename}`,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), sample.buffer);

  const missingImage = await fetch(
    `http://127.0.0.1:${address.port}/uploads/not-found.jpg`,
  );
  assert.equal(missingImage.status, 404);
});
