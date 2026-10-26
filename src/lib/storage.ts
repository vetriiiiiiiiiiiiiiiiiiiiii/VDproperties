import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

let s3: S3Client | undefined;
function s3Client() {
  s3 ??= new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
  return s3;
}

export class UploadError extends Error {}

/**
 * Decodes the upload with sharp (rejecting anything that isn't a real raster image),
 * applies EXIF rotation, strips metadata such as GPS tags, resizes and re-encodes to WebP.
 */
export async function processImage(input: Buffer) {
  if (input.byteLength > MAX_IMAGE_BYTES) throw new UploadError("Images must be 12 MB or smaller");
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new UploadError("This file isn't a supported image");
  }
  if (!meta.format || !ALLOWED_IMAGE_FORMATS.has(meta.format)) {
    throw new UploadError("Upload JPEG, PNG, WebP or AVIF images only");
  }
  const { data, info } = await sharp(input, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

export function assertPdf(input: Buffer) {
  if (input.byteLength > MAX_DOCUMENT_BYTES) throw new UploadError("Documents must be 10 MB or smaller");
  if (input.subarray(0, 5).toString("latin1") !== "%PDF-") throw new UploadError("Upload PDF documents only");
}

/** Saves a publicly served file and returns its URL. */
export async function savePublicImage(buffer: Buffer, folder: "properties" | "projects" | "site") {
  const key = `public/${folder}/${randomUUID()}.webp`;
  if (driver === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${(process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;
  }
  await writeLocal(key, buffer);
  return `/media/${key.replace(/^public\//, "")}`;
}

/** Saves a document that is only ever served through an authorisation check. Returns a storage key. */
export async function savePrivateDocument(buffer: Buffer) {
  const key = `private/documents/${randomUUID()}.pdf`;
  if (driver === "s3") {
    await s3Client().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: "application/pdf" }));
  } else {
    await writeLocal(key, buffer);
  }
  return key;
}

/** Saves a BuildTrace photo or document privately. Returns the storage key. */
export async function savePrivateBuildFile(buffer: Buffer, ext: "webp" | "pdf") {
  const key = `private/build/${randomUUID()}.${ext}`;
  if (driver === "s3") {
    await s3Client().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: ext === "pdf" ? "application/pdf" : "image/webp" }));
  } else {
    await writeLocal(key, buffer);
  }
  return key;
}

export async function readPrivateDocument(key: string) {
  if (!/^private\/(documents|build)\/[0-9a-f-]{36}\.(pdf|webp)$/.test(key)) throw new UploadError("Invalid document key");
  if (driver === "s3") {
    const res = await s3Client().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  return readFile(path.join(uploadRoot, key));
}

/** Best-effort removal of a stored file; never throws. */
export async function deleteStored(urlOrKey: string) {
  try {
    const key = urlOrKey.startsWith("/media/")
      ? `public/${urlOrKey.slice("/media/".length)}`
      : urlOrKey.startsWith("private/")
        ? urlOrKey
        : urlOrKey.replace(`${(process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "")}/`, "");
    if (!/^(public|private)\/[a-z]+\/[0-9a-f-]{36}\.(webp|pdf)$/.test(key)) return;
    if (driver === "s3") await s3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    else await unlink(path.join(uploadRoot, key));
  } catch (err) {
    console.warn("Could not delete stored file", err);
  }
}

/** Resolves a /media/* request to a file inside the public upload folder, refusing traversal. */
export function resolveLocalMedia(segments: string[]) {
  const rel = segments.join("/");
  if (!/^[a-z]+\/[0-9a-f-]{36}\.webp$/.test(rel)) return null;
  const full = path.resolve(uploadRoot, "public", rel);
  if (!full.startsWith(path.join(uploadRoot, "public") + path.sep)) return null;
  return full;
}

async function writeLocal(key: string, buffer: Buffer) {
  const full = path.join(uploadRoot, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
}
