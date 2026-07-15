import { AWS_REGIONS } from "@/types";

export const AZS: Record<string, string[]> = {
  "us-east-1": ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1e", "us-east-1f"],
  "us-east-2": ["us-east-2a", "us-east-2b", "us-east-2c"],
  "us-west-2": ["us-west-2a", "us-west-2b", "us-west-2c", "us-west-2d"],
  "eu-west-1": ["eu-west-1a", "eu-west-1b", "eu-west-1c"],
  "ap-south-1": ["ap-south-1a", "ap-south-1b", "ap-south-1c"],
};

export const ACCOUNT_ID = "566889948003";
export const regionalSuffix = (region: string) => `-${ACCOUNT_ID}-${region}-an`;

export const REGIONS = AWS_REGIONS.map((region) => [region.value, region.label] as const);

export interface BucketForm {
  region: string;
  bucketType: "general" | "directory";
  namespace: "global" | "regional";
  name: string;
  namePrefix: string;
  baseName: string;
  az: string;
  acknowledgeSingleAZ: boolean;
  copyFrom: string;
  objectOwnership: "acl-disabled" | "acl-enabled";
  aclOwnership: "bucket-owner-preferred" | "object-writer";
  blockAllPublic: boolean;
  blockNewAcls: boolean;
  blockAnyAcls: boolean;
  blockNewPolicies: boolean;
  blockCrossAccountPolicies: boolean;
  acknowledgeBlockPublic: boolean;
  versioning: boolean;
  tags: { k: string; v: string }[];
  encryptionType: "SSE-S3" | "SSE-KMS" | "DSSE-KMS";
  kmsKeySource: "choose" | "enter-arn";
  selectedKmsKey: string;
  kmsKeyArn: string;
  bucketKey: boolean;
  objectLock: boolean;
  acknowledgeObjectLock: boolean;
  justification: string;
}

export const initialForm = (): BucketForm => ({
  region: "us-east-1",
  bucketType: "general",
  namespace: "global",
  name: "",
  namePrefix: "",
  baseName: "",
  az: "",
  acknowledgeSingleAZ: false,
  copyFrom: "",
  objectOwnership: "acl-disabled",
  aclOwnership: "bucket-owner-preferred",
  blockAllPublic: true,
  blockNewAcls: true,
  blockAnyAcls: true,
  blockNewPolicies: true,
  blockCrossAccountPolicies: true,
  acknowledgeBlockPublic: false,
  versioning: false,
  tags: [],
  encryptionType: "SSE-S3",
  kmsKeySource: "choose",
  selectedKmsKey: "",
  kmsKeyArn: "",
  bucketKey: true,
  objectLock: false,
  acknowledgeObjectLock: false,
  justification: "",

});

export interface S3BucketMeta {
  bucketType: "general" | "directory";
  namespace: "global" | "regional";
  objectOwnership: "acl-disabled" | "acl-enabled";
  publicAccess: boolean;
  versioning?: boolean;
  encryption: string;
  bucketKey: boolean;
  status?: string;
  tags: { k: string; v: string }[];
  sizeGB: number;
  objects: number;
  justification?: string;
}

export interface S3Bucket {
  id: string;
  name: string;
  region: string;
  createdBy: string;
  userId?: number | string;
  createdAt?: string;
  meta: S3BucketMeta;
}

export const regionLabel = (code: string) => {
   AWS_REGIONS.find((region) => region.value === code);
  return code;
};

export const encryptionLabel = (encryption: string) =>
  encryption === "aws:kms" ? "SSE-KMS" : "SSE-S3";
