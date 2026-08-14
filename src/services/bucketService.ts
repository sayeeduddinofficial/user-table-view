import { apiClient, env } from '@/lib/api';
import { BucketForm } from '@/utils/s3.utils';

export interface CreateBucketRequest {
  bucketType: 'GENERAL' | 'DIRECTORY';
  bucketNamespace: 'GLOBAL' | 'ACCOUNT_REGIONAL';
  bucketName?: string;
  bucketNamePrefix?: string;
  region: string;
  aclEnabled: boolean;
  objectOwnership?: 'BUCKET_OWNER_PREFERRED' | 'OBJECT_WRITER';
  versioningEnabled: boolean;
  blockPublicAccess: {
    blockPublicAcls: boolean;
    ignorePublicAcls: boolean;
    blockPublicPolicy: boolean;
    restrictPublicBuckets: boolean;
  };
  encryption: {
    type: 'SSE-S3' | 'SSE-KMS' | 'DSSE-KMS';
    bucketKey: boolean;
  };
  tags: Array<{ key: string; value: string }>;
  justification?: string;
}

export interface BucketItem {
  request_id?: string;
  id?: string;
  bucket_name?: string | null;
  bucketName?: string;
  bucket_type?: string;
  bucketType?: string;
  bucket_namespace?: string;
  bucketNamespace?: string;
  region?: string;
  created_at?: string;
  createdAt?: string;
  user_id?: number | string;
  user_name?: string;
  justification?: string;
  versioning_enabled?: boolean;
  block_public_access?: boolean;
  status?: string;
  last_operation?: string;
  [key: string]: unknown;
}

export interface BucketListResponse {
  data?: BucketItem[];
}

export interface CreateBucketResponse {
  message?: string;
  data?: BucketItem;
}

export interface DeleteBucketResponse {
  message?: string;
  data?: { requestId?: string; status?: string };
}

export function buildCreateBucketRequest(form: BucketForm, bucketName: string): CreateBucketRequest {
  const isRegional = form.namespace === 'regional';

  const aclEnabled = form.objectOwnership === 'acl-enabled';

  const payload: CreateBucketRequest = {
    region: form.region,
    bucketType: form.bucketType === 'directory' ? 'DIRECTORY' : 'GENERAL',
    bucketName: bucketName,
    bucketNamespace: isRegional ? 'ACCOUNT_REGIONAL' : 'GLOBAL',
    bucketNamePrefix: isRegional ? form.namePrefix : undefined,
    aclEnabled,
    versioningEnabled: form.versioning,
    blockPublicAccess: {
      blockPublicAcls: form.blockNewAcls,
      ignorePublicAcls: form.blockAnyAcls,
      blockPublicPolicy: form.blockNewPolicies,
      restrictPublicBuckets: form.blockCrossAccountPolicies,
    },
    encryption: {
      type: form.encryptionType,
      bucketKey: form.bucketKey,
    },
    tags: form.tags.map(({ k, v }) => ({ key: k, value: v })),
    justification: form.justification || undefined,
  };

  // Only include objectOwnership when ACLs are enabled
  if (aclEnabled) {
    payload.objectOwnership = 'BUCKET_OWNER_PREFERRED';
  }

  return payload;
}

export async function fetchBucketsApi(): Promise<BucketItem[]> {
  const response = await apiClient.get<BucketListResponse>(env.bucketService, 'getBuckets');
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createBucketApi(payload: CreateBucketRequest): Promise<CreateBucketResponse> {
  return apiClient.post<CreateBucketResponse, CreateBucketRequest>(env.bucketService, 'buckets', payload);
}

export async function deleteBucketApi(requestId: string): Promise<DeleteBucketResponse> {
  return apiClient.delete<DeleteBucketResponse>(env.bucketService, `buckets/${encodeURIComponent(requestId)}`);
}

export async function checkBucketNameApi(
  bucketName: string,
  region: string,
  namespace: string
): Promise<{ exists: boolean }> {
  return apiClient.get<{ exists: boolean }>(
    env.bucketService,
    `check-name?bucketName=${encodeURIComponent(
      bucketName
    )}&region=${region}&namespace=${namespace}`
  );
}

export interface S3QuotaIncreasePayload {
  requestedQuota: number;
  reason: string;
  approverEmail: string;
}

export async function requestS3QuotaIncrease(
  userId: number | string | undefined,
  payload: S3QuotaIncreasePayload
): Promise<void> {
  await apiClient.post<{ success?: boolean; message?: string }>(
    env.bucketService,
    `s3-quota/${userId}/request`,
    { ...payload }
  );
}