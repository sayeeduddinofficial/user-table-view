import { apiClient, env } from "@/lib/api";

export interface SSHKey {
  id: string;
  name: string;
  public_key: string;
  private_key?: string;
  fingerprint: string | null;
  expires_at: string;
  created_at: string;
}

export interface CreateSSHKeyPayload {
  name: string;
  expirationDays: number;
}

export interface CreateSSHKeyResponse {
  id: string;
  name: string;
  public_key: string;
  fingerprint: string | null;
  expires_at: string;
  created_at: string;
}

export interface PrivateKeyResponse {
  id: string;
  name: string;
  private_key: string;
}

export interface ValidationDetail {
  field: string;
  message: string;
  code: string;
}

export async function fetchMySSHKeysApi(): Promise<SSHKey[]> {
  const data = await apiClient.get<SSHKey[]>(env.sshKey, "/api/ssh-keys/mysshkey");
  return Array.isArray(data) ? data : [];
}

export async function createSSHKeyApi(payload: CreateSSHKeyPayload): Promise<CreateSSHKeyResponse> {
  return apiClient.post<CreateSSHKeyResponse>(env.sshKey, "/api/ssh-keys", payload);
}

export async function fetchPrivateKeyApi(keyId: string): Promise<PrivateKeyResponse> {
  return apiClient.get<PrivateKeyResponse>(env.sshKey, `/api/ssh-keys/${keyId}/private`);
}

export async function deleteSSHKeyApi(keyId: string): Promise<void> {
  await apiClient.delete<void>(env.sshKey, `/api/ssh-keys/${keyId}`);
}
