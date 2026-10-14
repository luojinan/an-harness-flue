export const MAX_CHAT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** OSS `x-oss-process` 参数：把上传的图片转为 WebP 作为预览。 */
export const CHAT_IMAGE_PREVIEW_PROCESS = "image/format,webp";

export const ALLOWED_CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ChatAttachmentStatus =
  | "uploading"
  | "ready"
  | "upload-error";

/**
 * 客户端上传过程中的图片附件状态。
 * `base64` 是去掉 `data:...;base64,` 前缀后的裸 Base64 字符串，
 * 直接交给 `useFlueAgent.sendMessage(text, { images })`。
 */
export interface ChatImageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: ChatAttachmentStatus;
  previewUrl?: string;
  base64?: string;
  bucket?: string;
  region?: string;
  objectKey?: string;
  llmImageUrl?: string;
  error?: string;
}

export function isAllowedChatImageType(contentType: string): boolean {
  return (ALLOWED_CHAT_IMAGE_TYPES as readonly string[]).includes(contentType);
}

export interface ChatUploadPolicyRequest {
  conversationId: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface ChatUploadPolicyResponse {
  bucket: string;
  region: string;
  host: string;
  objectKey: string;
  policy: string;
  signature: string;
  ossAccessKeyId: string;
  successActionStatus: string;
  expireAt: number;
}

export interface ChatSignedObjectUrlRequest {
  bucket: string;
  region: string;
  objectKey: string;
  imageProcess?: string;
}

export interface ChatSignedObjectUrlResponse {
  url: string;
  expiresAt: number;
}
