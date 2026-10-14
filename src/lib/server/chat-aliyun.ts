import { Buffer } from "node:buffer";
import { createHmac, randomUUID } from "node:crypto";
import { posix as pathPosix } from "node:path";

import {
  CHAT_IMAGE_PREVIEW_PROCESS,
  isAllowedChatImageType,
  MAX_CHAT_IMAGE_SIZE_BYTES,
  type ChatSignedObjectUrlResponse,
  type ChatUploadPolicyResponse,
} from "@/lib/chat-image";

type RuntimeEnv = Record<string, string | undefined>;

const DEFAULT_OSS_UPLOAD_PREFIX = "chat-images";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 10;
const DEFAULT_UPLOAD_POLICY_TTL_SECONDS = 60 * 5;

function getEnv(env: RuntimeEnv | undefined, key: string): string | undefined {
  const value = env?.[key] ?? process.env[key];
  return value?.trim() || undefined;
}

function getRequiredEnv(env: RuntimeEnv | undefined, keys: string[]): string {
  for (const key of keys) {
    const value = getEnv(env, key);
    if (value) {
      return value;
    }
  }
  throw new Error(
    `Missing required environment variable: ${keys.join(" or ")}`,
  );
}

function normalizePrefix(prefix: string): string {
  return prefix.replace(/^\/+|\/+$/g, "");
}

function sanitizeSegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, "-");
  return sanitized || "unknown";
}

function sanitizeFileName(fileName: string): string {
  const ext = pathPosix.extname(fileName).toLowerCase();
  const baseName = pathPosix.basename(fileName, ext);
  const safeBaseName = sanitizeSegment(baseName).slice(0, 80);
  const safeExt = ext.replace(/[^a-z0-9.]/g, "").slice(0, 10);
  return `${safeBaseName || "image"}${safeExt}`;
}

function formatOssHost(bucket: string, region: string): string {
  return `https://${bucket}.oss-${region}.aliyuncs.com`;
}

function encodeObjectKeyForUrl(objectKey: string): string {
  return objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function assertAllowedImageUpload(contentType: string, size: number) {
  if (!isAllowedChatImageType(contentType)) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }
  if (size <= 0 || size > MAX_CHAT_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Image size must be between 1 byte and ${MAX_CHAT_IMAGE_SIZE_BYTES} bytes`,
    );
  }
}

function assertObjectKeyAllowed(objectKey: string, env?: RuntimeEnv) {
  const prefix = normalizePrefix(
    getEnv(env, "ALIYUN_OSS_UPLOAD_PREFIX") || DEFAULT_OSS_UPLOAD_PREFIX,
  );
  if (!objectKey.startsWith(`${prefix}/`)) {
    throw new Error("Object key is outside the allowed upload prefix");
  }
}

interface BuildUploadPolicyOptions {
  conversationId: string;
  fileName: string;
  contentType: string;
  size: number;
}

export function buildChatUploadPolicy(
  { conversationId, fileName, contentType, size }: BuildUploadPolicyOptions,
  env?: RuntimeEnv,
): ChatUploadPolicyResponse {
  assertAllowedImageUpload(contentType, size);

  const accessKeyId = getRequiredEnv(env, [
    "ALIBABA_CLOUD_ACCESS_KEY_ID",
    "ALIYUN_ACCESS_KEY_ID",
  ]);
  const accessKeySecret = getRequiredEnv(env, [
    "ALIBABA_CLOUD_ACCESS_KEY_SECRET",
    "ALIYUN_ACCESS_KEY_SECRET",
  ]);
  const bucket = getRequiredEnv(env, ["ALIYUN_OSS_BUCKET"]);
  const region = getRequiredEnv(env, ["ALIYUN_OSS_REGION"]);
  const prefix = normalizePrefix(
    getEnv(env, "ALIYUN_OSS_UPLOAD_PREFIX") || DEFAULT_OSS_UPLOAD_PREFIX,
  );

  const safeConversationId = sanitizeSegment(conversationId).slice(0, 64);
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeFileName = sanitizeFileName(fileName);
  const objectKey = `${prefix}/${year}/${month}/${safeConversationId}/${randomUUID()}-${safeFileName}`;
  const expireAt = Date.now() + DEFAULT_UPLOAD_POLICY_TTL_SECONDS * 1000;

  const policy = Buffer.from(
    JSON.stringify({
      expiration: new Date(expireAt).toISOString(),
      conditions: [
        ["eq", "$key", objectKey],
        ["eq", "$Content-Type", contentType],
        ["content-length-range", 1, MAX_CHAT_IMAGE_SIZE_BYTES],
        ["eq", "$success_action_status", "204"],
      ],
    }),
  ).toString("base64");

  const signature = createHmac("sha1", accessKeySecret)
    .update(policy)
    .digest("base64");

  return {
    bucket,
    region,
    host: formatOssHost(bucket, region),
    objectKey,
    policy,
    signature,
    ossAccessKeyId: accessKeyId,
    successActionStatus: "204",
    expireAt,
  };
}

interface SignObjectUrlOptions {
  bucket: string;
  region: string;
  objectKey: string;
  expiresInSeconds?: number;
  imageProcess?: string;
}

export function signChatObjectUrl(
  {
    bucket,
    region,
    objectKey,
    expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
    imageProcess,
  }: SignObjectUrlOptions,
  env?: RuntimeEnv,
): ChatSignedObjectUrlResponse {
  assertObjectKeyAllowed(objectKey, env);
  if (imageProcess && imageProcess !== CHAT_IMAGE_PREVIEW_PROCESS) {
    throw new Error("Unsupported image process");
  }

  const accessKeyId = getRequiredEnv(env, [
    "ALIBABA_CLOUD_ACCESS_KEY_ID",
    "ALIYUN_ACCESS_KEY_ID",
  ]);
  const accessKeySecret = getRequiredEnv(env, [
    "ALIBABA_CLOUD_ACCESS_KEY_SECRET",
    "ALIYUN_ACCESS_KEY_SECRET",
  ]);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const canonicalizedResource = `/${bucket}/${objectKey}${
    imageProcess ? `?x-oss-process=${imageProcess}` : ""
  }`;
  const stringToSign = `GET\n\n\n${expiresAt}\n${canonicalizedResource}`;
  const signature = createHmac("sha1", accessKeySecret)
    .update(stringToSign)
    .digest("base64");

  const url = `${formatOssHost(bucket, region)}/${encodeObjectKeyForUrl(
    objectKey,
  )}`;
  const authParams = new URLSearchParams({
    OSSAccessKeyId: accessKeyId,
    Expires: String(expiresAt),
    Signature: signature,
  });
  const query = imageProcess
    ? `x-oss-process=${imageProcess}&${authParams.toString()}`
    : authParams.toString();

  return {
    url: `${url}?${query}`,
    expiresAt: expiresAt * 1000,
  };
}
