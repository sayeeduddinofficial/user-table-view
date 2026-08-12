// Static option lists for the EKS detail screens.

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