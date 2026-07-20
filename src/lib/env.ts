// Environment variable validation
const requiredEnvVars = [
  'VITE_AUTH_URL',
  'VITE_USER_MANAGEMENT_URL',
  'VITE_NOTIFICATION_SERVICE_URL',
  'VITE_AWS_CONFIG_URL',
  'VITE_VM_REQUEST_SERVICE_URL',
  'VITE_API_SSH_KEYS_URL',
  'VITE_FEEDBACK_SERVICE_URL',
  'VITE_BUCKET_SERVICE_URL',
  'VITE_LB_SERVICE_URL',
  'VITE_ROUTE53_SERVICE_URL',
  'VITE_SOCKET_URL',
  'VITE_ENTRA_CLIENT_ID',
  'VITE_ENTRA_TENANT_ID',
  'VITE_ENTRA_REDIRECT_URI',
  'VITE_VPC_SERVICE_URL',
  'VITE_EKS_CLUSTER_SERVICE_URL',
  'VITE_RDS_SERVICE_URL',
] as const;

function validateEnv() {
  const missing: string[] = [];
  
  requiredEnvVars.forEach(key => {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0 && import.meta.env.DEV) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

export const env = {
  auth: import.meta.env.VITE_AUTH_URL,
  userManagement: import.meta.env.VITE_USER_MANAGEMENT_URL,
  notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL,
  awsSettings: import.meta.env.VITE_AWS_CONFIG_URL,
  vmRequest: import.meta.env.VITE_VM_REQUEST_SERVICE_URL,
  sshKey: import.meta.env.VITE_API_SSH_KEYS_URL,
  feedback: import.meta.env.VITE_FEEDBACK_SERVICE_URL,
  runtime: import.meta.env.VITE_RUNTIME_SERVICE_URL,
  lbService: import.meta.env.VITE_LB_SERVICE_URL,
  route53Service: import.meta.env.VITE_ROUTE53_SERVICE_URL,
  socket: import.meta.env.VITE_SOCKET_URL,
  entraClientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
  entraTenantId: import.meta.env.VITE_ENTRA_TENANT_ID,
  entraRedirectUri: import.meta.env.VITE_ENTRA_REDIRECT_URI,
  vpcService: import.meta.env.VITE_VPC_SERVICE_URL,
  bucketService: import.meta.env.VITE_BUCKET_SERVICE_URL,
  rds: import.meta.env.VITE_RDS_SERVICE_URL,
  eksClusterService: import.meta.env.VITE_EKS_CLUSTER_SERVICE_URL
} as const;
