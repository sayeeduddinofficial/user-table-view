export type DetailTab =
  | "overview"
  | "resources"
  | "compute"
  | "networking"
  | "tags";

// Static demo data based on screenshot
export const CLUSTER = {
  name: "test-splunkOps",
  status: "Active",
  kubernetesVersion: "1.36",
  supportPeriod: "Standard support until August 2, 2027",
  provider: "EKS",
  clusterHealth: 0,
  upgradeInsights: 4,
  nodeHealthIssues: 0,
  capabilityIssues: 0,
  apiServerEndpoint:
    "https://5751F2D02A5B86E53A75C97B036DC17B.yl4.us-east-2.eks.amazonaws.com",
  oidcProviderUrl:
    "https://oidc.eks.us-east-2.amazonaws.com/id/5751F2D02A5B86E53A75C97B036DC17B",
  created: "23 minutes ago",
  certificateAuthority:
    "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJRTRRcU5vbGdmMGN3RFFZSktvWklodmNOQVFFTEJRQXcKVXlZ0F3SUJBZ0lJRTRRcU5vbGdmMGN3RFFZSktvWklodmNOQVFFTEJRQXcK",
  clusterIamRoleArn: "arn:aws:iam::566889948003:role/SplunkOps-EKS-Role",
  clusterArn: "arn:aws:eks:us-east-2:566889948003:cluster/test-splunkOps",
  platformVersion: "eks.7",
  nodeIamRole: "arn:aws:iam::566889948003:role/SplunkOps-EKS-Node-Role",
  vpcId: "REQ-1784108710831",
  subnets: [
    {
      id: "subnet-0a1b2c3d4e5f60001",
      az: "us-east-2a",
      type: "public",
      cidr: "10.0.1.0/24",
    },
    {
      id: "subnet-0a1b2c3d4e5f60002",
      az: "us-east-2b",
      type: "public",
      cidr: "10.0.2.0/24",
    },
    {
      id: "subnet-0a1b2c3d4e5f60003",
      az: "us-east-2a",
      type: "private",
      cidr: "10.0.11.0/24",
    },
    {
      id: "subnet-0a1b2c3d4e5f60004",
      az: "us-east-2b",
      type: "private",
      cidr: "10.0.12.0/24",
    },
  ],
  securityGroups: ["sg-0abcdef1234567890"],
  serviceIpv4Cidr: "172.20.0.0/16",
  clusterEndpointAccess: "Public and private",
  clusterIpAddressFamily: "IPv4",
  additionalSecurityGroups: ["sg-0fb7a721c37f43269", "sg-0abcdef1234567891"],
  egressMode: "WS managed",
  publicAccessSourceAllowList: ["0.0.0.0/0"],
  nodeGroups: [
    {
      name: "splunkops-ng-1",
      status: "Active",
      instanceType: "t3.large",
      desired: 2,
      min: 1,
      max: 4,
      capacity: "ON_DEMAND",
    },
    {
      name: "splunkops-ng-2",
      status: "Active",
      instanceType: "t3.medium",
      desired: 3,
      min: 2,
      max: 6,
      capacity: "SPOT",
    },
  ],
  tags: {
    Owner: "nanag@outlook.com",
    Project: "SplunkOps",
    Environment: "dev",
  },
};

export const RESOURCE_GROUPS = [
  {
    group: "Workloads",
    items: [
      { id: "controllerRevision", name: "ControllerRevision" },
      { id: "cronJobs", name: "CronJobs" },
      { id: "daemonSets", name: "DaemonSets" },
      { id: "deployments", name: "Deployments" },
      { id: "horizontalPodAutoscalers", name: "HorizontalPodAutoscalers" },
      { id: "jobs", name: "Jobs" },
      { id: "pods", name: "Pods" },
      { id: "podTemplates", name: "PodTemplates" },
      { id: "replicaSets", name: "ReplicaSets" },
      { id: "replicationController", name: "ReplicationController" },
      { id: "statefulSets", name: "StatefulSets" },
    ],
  },

  {
    group: "Cluster",
    items: [
      { id: "apiServices", name: "APIServices" },
      { id: "binding", name: "Binding" },
      { id: "componentStatus", name: "ComponentStatus" },
      { id: "flowSchemas", name: "FlowSchemas" },
      { id: "leases", name: "Leases" },
      { id: "namespaces", name: "Namespaces" },
      { id: "nodes", name: "Nodes" },
      { id: "priorityClasses", name: "PriorityClasses" },
      {
        id: "priorityLevelConfigurations",
        name: "PriorityLevelConfigurations",
      },
      { id: "runtimeClasses", name: "RuntimeClasses" },
    ],
  },

  {
    group: "Service and networking",
    items: [
      { id: "endpoints", name: "Endpoints" },
      { id: "endpointSlices", name: "EndpointSlices" },
      { id: "ingressClasses", name: "IngressClasses" },
      { id: "ingresses", name: "Ingresses" },
      { id: "ipAddresses", name: "IPAddresses" },
      { id: "networkPolicies", name: "NetworkPolicies" },
      { id: "serviceCIDRs", name: "ServiceCIDRs" },
      { id: "services", name: "Services" },
    ],
  },

  {
    group: "Config and secrets",
    items: [
      { id: "configMaps", name: "ConfigMaps" },
      { id: "secrets", name: "Secrets" },
    ],
  },

  {
    group: "Storage",
    items: [
      { id: "csiDrivers", name: "CSIDrivers" },
      { id: "csiNodes", name: "CSINodes" },
      { id: "csiStorageCapacities", name: "CSIStorageCapacities" },
      { id: "deviceClasses", name: "DeviceClasses" },
      { id: "persistentVolumeClaims", name: "PersistentVolumeClaims" },
      { id: "persistentVolumes", name: "PersistentVolumes" },
      { id: "resourceClaims", name: "ResourceClaims" },
      { id: "resourceClaimTemplates", name: "ResourceClaimTemplates" },
      { id: "resourceSlices", name: "ResourceSlices" },
      { id: "storageClasses", name: "StorageClasses" },
      { id: "volumeAttachment", name: "VolumeAttachment" },
      { id: "volumeAttributesClasses", name: "VolumeAttributesClasses" },
    ],
  },

  {
    group: "Authentication",
    items: [
      { id: "certificateSigningRequest", name: "CertificateSigningRequest" },
      { id: "serviceAccounts", name: "ServiceAccounts" },
    ],
  },

  {
    group: "Authorization",
    items: [
      { id: "clusterRoleBindings", name: "ClusterRoleBindings" },
      { id: "clusterRoles", name: "ClusterRoles" },
      { id: "roleBindings", name: "RoleBindings" },
      { id: "roles", name: "Roles" },
    ],
  },

  {
    group: "Policy",
    items: [
      { id: "limitRanges", name: "LimitRanges" },
      { id: "podDisruptionBudgets", name: "PodDisruptionBudgets" },
      { id: "resourceQuotas", name: "ResourceQuotas" },
    ],
  },

  {
    group: "Extensions",
    items: [
      { id: "customResourceDefinitions", name: "CustomResourceDefinitions" },
      { id: "mutatingAdmissionPolicy", name: "MutatingAdmissionPolicy" },
      {
        id: "mutatingAdmissionPolicyBinding",
        name: "MutatingAdmissionPolicyBinding",
      },
      {
        id: "mutatingWebhookConfigurations",
        name: "MutatingWebhookConfigurations",
      },
      {
        id: "validatingAdmissionPolicies",
        name: "ValidatingAdmissionPolicies",
      },
      {
        id: "validatingAdmissionPolicyBindings",
        name: "ValidatingAdmissionPolicyBindings",
      },
      {
        id: "validatingWebhookConfigurations",
        name: "ValidatingWebhookConfigurations",
      },
    ],
  },
];
