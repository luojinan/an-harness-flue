import {
  type ChatSignedObjectUrlResponse,
  type ChatUploadPolicyRequest,
  type ChatUploadPolicyResponse,
} from '@/lib/chat-image';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

async function readJSON<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}

export async function requestUploadPolicy(
  payload: ChatUploadPolicyRequest,
): Promise<ChatUploadPolicyResponse> {
  const response = await fetch('/api/chat-upload-policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJSON<ChatUploadPolicyResponse>(response);
}

export async function uploadFileToOSS(
  file: File,
  policy: ChatUploadPolicyResponse,
): Promise<void> {
  const formData = new FormData();
  formData.set('key', policy.objectKey);
  formData.set('policy', policy.policy);
  formData.set('OSSAccessKeyId', policy.ossAccessKeyId);
  formData.set('signature', policy.signature);
  formData.set('success_action_status', policy.successActionStatus);
  formData.set('Content-Type', file.type);
  formData.set('file', file);

  const response = await fetch(policy.host, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OSS upload failed with status ${response.status}`);
  }
}

export async function requestSignedObjectUrl(
  bucket: string,
  region: string,
  objectKey: string,
  imageProcess?: string,
): Promise<ChatSignedObjectUrlResponse> {
  const response = await fetch('/api/chat-object-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, region, objectKey, imageProcess }),
  });
  return readJSON<ChatSignedObjectUrlResponse>(response);
}

/**
 * 把本地文件读成裸 Base64（去掉 `data:...;base64,` 前缀），
 * 供 `useFlueAgent.sendMessage(text, { images })` 使用。
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('读取文件失败'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}
