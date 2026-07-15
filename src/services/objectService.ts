import { apiClient, env } from '@/lib/api';

export interface ObjectEntry {
  name: string;
  fullPath: string;
  type: 'folder' | 'file';
  size?: number;
  lastModified?: string;
  storageClass?: string;
}

export interface ListObjectsResponse {
  path: string;
  folders: ObjectEntry[];
  files: ObjectEntry[];
}

export async function fetchObjectsApi(requestId: string, prefix = ''): Promise<ListObjectsResponse> {
  return apiClient.get<ListObjectsResponse>(
    env.bucketService,
    `buckets/${encodeURIComponent(requestId)}/objects`,
    prefix ? { prefix } : undefined
  );
}

export async function createFolderApi(requestId: string, prefix: string, folderName: string): Promise<ObjectEntry> {
  const path = `buckets/${encodeURIComponent(requestId)}/objects/folders${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`;
  const response = await apiClient.post<{ data: ObjectEntry }>(env.bucketService, path, { folderName });
  return response.data;
}

export async function uploadObjectApi(requestId: string, prefix: string, file: File): Promise<ObjectEntry> {
  const path = `buckets/${encodeURIComponent(requestId)}/objects/upload${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`;
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<{ data: ObjectEntry }>(env.bucketService, path, formData);
  return response.data;
}

export async function deleteObjectApi(requestId: string, key: string): Promise<ObjectEntry> {
  const path = `buckets/${encodeURIComponent(requestId)}/objects?key=${encodeURIComponent(key)}`;
  const response = await apiClient.delete<{ data: ObjectEntry }>(env.bucketService, path);
  return response.data;
}

export async function downloadObjectApi(requestId: string, key: string, fileName: string): Promise<void> {
  const path = `buckets/${encodeURIComponent(requestId)}/objects/download?key=${encodeURIComponent(key)}`;
  await apiClient.download(env.bucketService, path, fileName);
}
