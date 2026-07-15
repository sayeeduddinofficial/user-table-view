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
  vpcId: "vpc-0abc12345def67890",
  subnets: [
    { id: "subnet-0a1b2c3d4e5f60001", az: "us-east-2a", type: "public", cidr: "10.0.1.0/24" },
    { id: "subnet-0a1b2c3d4e5f60002", az: "us-east-2b", type: "public", cidr: "10.0.2.0/24" },
    { id: "subnet-0a1b2c3d4e5f60003", az: "us-east-2a", type: "private", cidr: "10.0.11.0/24" },
    { id: "subnet-0a1b2c3d4e5f60004", az: "us-east-2b", type: "private", cidr: "10.0.12.0/24" },
  ],
  securityGroups: ["sg-0abcdef1234567890"],
  serviceIpv4Cidr: "172.20.0.0/16",
  clusterEndpointAccess: "Public and private",
  clusterIpAddressFamily: "IPv4",
  additionalSecurityGroups: ["sg-0fb7a721c37f43269", "sg-0abcdef1234567891"],
  egressMode: "WS managed",
  publicAccessSourceAllowList: ["0.0.0.0/0"],
  nodeGroups: [
    { name: "splunkops-ng-1", status: "Active", instanceType: "t3.large", desired: 2, min: 1, max: 4, capacity: "ON_DEMAND" },
    { name: "splunkops-ng-2", status: "Active", instanceType: "t3.medium", desired: 3, min: 2, max: 6, capacity: "SPOT" },
  ],
  tags: {
    Owner: "nanag@outlook.com",
    Project: "SplunkOps",
    Environment: "dev",
  },
};

export const RESOURCE_GROUPS: {
  group: string;
  items: { name: string; columns: string[]; rows: (string | number)[][] }[];
}[] = [
  {
    group: "Workloads",
    items: [
      { name: "ControllerRevision", columns: ["Name", "Created"], rows: [] },
      { name: "CronJobs", columns: ["Name", "Namespace", "Schedule", "Suspend", "Active", "Last schedule"], rows: [] },
      { name: "DaemonSets", columns: ["Name", "Namespace", "Desired", "Current", "Ready", "Up-to-date"], rows: [["aws-node", "kube-system", 2, 2, 2, 2], ["kube-proxy", "kube-system", 2, 2, 2, 2]] },
      { name: "Deployments", columns: ["Name", "Namespace", "Ready", "Up-to-date", "Available", "Age"], rows: [["coredns", "kube-system", "2/2", 2, 2, "23m"]] },
      { name: "HorizontalPodAutoscalers", columns: ["Name", "Namespace", "Reference", "Targets", "Min", "Max"], rows: [] },
      { name: "Jobs", columns: ["Name", "Namespace", "Completions", "Duration", "Age"], rows: [] },
      { name: "Pods", columns: ["Name", "Namespace", "Ready", "Status", "Restarts", "Age"], rows: [["coredns-abc", "kube-system", "1/1", "Running", 0, "23m"], ["coredns-def", "kube-system", "1/1", "Running", 0, "23m"], ["aws-node-xyz", "kube-system", "1/1", "Running", 0, "23m"]] },
      { name: "PodTemplates", columns: ["Name", "Namespace", "Containers"], rows: [] },
      { name: "ReplicaSets", columns: ["Name", "Namespace", "Desired", "Current", "Ready", "Age"], rows: [["coredns-6d4b75cb6d", "kube-system", 2, 2, 2, "23m"]] },
      { name: "ReplicationController", columns: ["Name", "Namespace", "Desired", "Current", "Ready"], rows: [] },
      { name: "StatefulSets", columns: ["Name", "Namespace", "Ready", "Age"], rows: [] },
    ],
  },
  {
    group: "Cluster",
    items: [
      { name: "APIServices", columns: ["Name", "Service", "Available", "Age"], rows: [] },
      { name: "Binding", columns: ["Name", "Namespace"], rows: [] },
      { name: "ComponentStatus", columns: ["Name", "Status", "Message"], rows: [] },
      { name: "FlowSchemas", columns: ["Name", "PriorityLevel", "MatchingPrecedence"], rows: [] },
      { name: "Leases", columns: ["Name", "Namespace", "Holder", "Age"], rows: [] },
      { name: "Namespaces", columns: ["Name", "Status", "Age"], rows: [["default", "Active", "23m"], ["kube-system", "Active", "23m"], ["kube-public", "Active", "23m"], ["kube-node-lease", "Active", "23m"]] },
      { name: "Nodes", columns: ["Name", "Status", "Roles", "Version", "Age"], rows: [["ip-10-0-1-12", "Ready", "worker", "v1.36.0", "23m"], ["ip-10-0-2-34", "Ready", "worker", "v1.36.0", "23m"]] },
      { name: "PriorityClasses", columns: ["Name", "Value", "Global default", "Age"], rows: [] },
      { name: "PriorityLevelConfigurations", columns: ["Name", "Type", "AssuredConcurrencyShares"], rows: [] },
      { name: "RuntimeClasses", columns: ["Name", "Handler", "Age"], rows: [] },
    ],
  },
  {
    group: "Service and networking",
    items: [
      { name: "Endpoints", columns: ["Name", "Namespace", "Endpoints", "Age"], rows: [["kubernetes", "default", "10.0.1.12:443", "23m"]] },
      { name: "EndpointSlices", columns: ["Name", "Namespace", "AddressType", "Ports"], rows: [] },
      { name: "IngressClasses", columns: ["Name", "Controller", "Age"], rows: [] },
      { name: "Ingresses", columns: ["Name", "Namespace", "Class", "Hosts", "Address"], rows: [] },
      { name: "IPAddresses", columns: ["Name", "ParentRef"], rows: [] },
      { name: "NetworkPolicies", columns: ["Name", "Namespace", "PodSelector", "Age"], rows: [] },
      { name: "ServiceCIDRs", columns: ["Name", "CIDRs", "Age"], rows: [] },
      { name: "Services", columns: ["Name", "Namespace", "Type", "Cluster IP", "External IP", "Ports"], rows: [["kubernetes", "default", "ClusterIP", "172.20.0.1", "—", "443/TCP"], ["kube-dns", "kube-system", "ClusterIP", "172.20.0.10", "—", "53/UDP,53/TCP"]] },
    ],
  },
  {
    group: "Config and secrets",
    items: [
      { name: "ConfigMaps", columns: ["Name", "Namespace", "Data", "Age"], rows: [["coredns", "kube-system", 1, "23m"], ["kube-proxy", "kube-system", 2, "23m"]] },
      { name: "Secrets", columns: ["Name", "Namespace", "Type", "Data", "Age"], rows: [["default-token", "default", "kubernetes.io/service-account-token", 3, "23m"]] },
    ],
  },
  {
    group: "Storage",
    items: [
      { name: "CSIDrivers", columns: ["Name", "Attach required", "Age"], rows: [] },
      { name: "CSINodes", columns: ["Name", "Drivers", "Age"], rows: [] },
      { name: "CSIStorageCapacities", columns: ["Name", "StorageClass", "Capacity"], rows: [] },
      { name: "DeviceClasses", columns: ["Name", "Age"], rows: [] },
      { name: "PersistentVolumeClaims", columns: ["Name", "Namespace", "Status", "Volume", "Capacity"], rows: [] },
      { name: "PersistentVolumes", columns: ["Name", "Capacity", "Access modes", "Status", "Claim"], rows: [] },
      { name: "ResourceClaims", columns: ["Name", "Namespace", "State"], rows: [] },
      { name: "ResourceClaimTemplates", columns: ["Name", "Namespace"], rows: [] },
      { name: "ResourceSlices", columns: ["Name", "Node"], rows: [] },
      { name: "StorageClasses", columns: ["Name", "Provisioner", "ReclaimPolicy", "Age"], rows: [["gp2", "kubernetes.io/aws-ebs", "Delete", "23m"]] },
      { name: "VolumeAttachment", columns: ["Name", "Attacher", "PV", "Node", "Attached"], rows: [] },
      { name: "VolumeAttributesClasses", columns: ["Name", "DriverName"], rows: [] },
    ],
  },
  {
    group: "Authentication",
    items: [
      { name: "CertificateSigningRequest", columns: ["Name", "Age", "Requestor", "Condition"], rows: [] },
      { name: "ServiceAccounts", columns: ["Name", "Namespace", "Secrets", "Age"], rows: [["default", "default", 0, "23m"]] },
    ],
  },
  {
    group: "Authorization",
    items: [
      { name: "ClusterRoleBindings", columns: ["Name", "Role", "Age"], rows: [["cluster-admin", "ClusterRole/cluster-admin", "23m"]] },
      { name: "ClusterRoles", columns: ["Name", "Age"], rows: [["cluster-admin", "23m"], ["admin", "23m"], ["edit", "23m"], ["view", "23m"]] },
      { name: "RoleBindings", columns: ["Name", "Namespace", "Role", "Age"], rows: [] },
      { name: "Roles", columns: ["Name", "Namespace", "Age"], rows: [] },
    ],
  },
  {
    group: "Policy",
    items: [
      { name: "LimitRanges", columns: ["Name", "Namespace", "Age"], rows: [] },
      { name: "PodDisruptionBudgets", columns: ["Name", "Namespace", "Min available", "Max unavailable"], rows: [] },
      { name: "ResourceQuotas", columns: ["Name", "Namespace", "Age"], rows: [] },
    ],
  },
  {
    group: "Extensions",
    items: [
      { name: "CustomResourceDefinitions", columns: ["Name", "Group", "Version", "Age"], rows: [] },
      { name: "MutatingAdmissionPolicy", columns: ["Name", "Age"], rows: [] },
      { name: "MutatingAdmissionPolicyBinding", columns: ["Name", "PolicyName"], rows: [] },
      { name: "MutatingWebhookConfigurations", columns: ["Name", "Webhooks", "Age"], rows: [] },
      { name: "ValidatingAdmissionPolicies", columns: ["Name", "Age"], rows: [] },
      { name: "ValidatingAdmissionPolicyBindings", columns: ["Name", "PolicyName"], rows: [] },
      { name: "ValidatingWebhookConfigurations", columns: ["Name", "Webhooks", "Age"], rows: [] },
    ],
  },
];
