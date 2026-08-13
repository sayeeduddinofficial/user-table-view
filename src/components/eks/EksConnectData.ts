export type ConnectOsId =
  | "amazon-linux-2023"
  | "ubuntu-26.04"
  | "rhel-10"
  | "suse-linux-16"
  | "windows-server-2025"
  | "debian-13";

export interface ConnectOsOption {
  id: ConnectOsId;
  label: string;
  subtitle: string;
  dotClassName: string;
  isWindows?: boolean;
}

export const CONNECT_OS_OPTIONS: ConnectOsOption[] = [
  { id: "amazon-linux-2023", label: "Amazon Linux 2023", subtitle: "dnf", dotClassName: "bg-orange-500" },
  { id: "ubuntu-26.04", label: "Ubuntu 26.04", subtitle: "apt", dotClassName: "bg-orange-500" },
  { id: "rhel-10", label: "RHEL 10", subtitle: "dnf", dotClassName: "bg-red-500" },
  { id: "suse-linux-16", label: "SUSE Linux Enterprise Server 16", subtitle: "zypper", dotClassName: "bg-green-500" },
  { id: "windows-server-2025", label: "Windows Server 2025", subtitle: "PowerShell", dotClassName: "bg-blue-500", isWindows: true },
  { id: "debian-13", label: "Debian 13", subtitle: "apt", dotClassName: "bg-red-500" },
];

export interface ConnectContext {
  clusterName: string;
  region: string;
}

/** One individual, single-purpose setup step (one command per step). */
export interface OsSetupStep {
  id: string;
  title: string;
  /** Optional instructional text shown above the command, e.g. "Open PowerShell as Administrator:". */
  note?: string;
  /** May contain {{REGION}} / {{CLUSTER_NAME}} tokens, resolved via resolveStepCode(). */
  code: string;
}

const REGION_TOKEN = "{{REGION}}";
const CLUSTER_NAME_TOKEN = "{{CLUSTER_NAME}}";

function resolveCode(code: string, ctx: ConnectContext): string {
  return code
    .replace(/\{\{REGION\}\}/g, ctx.region)
    .replace(/\{\{CLUSTER_NAME\}\}/g, ctx.clusterName);
}

const UPDATE_KUBECONFIG_STEP: Omit<OsSetupStep, "id"> = {
  title: "Configure EKS access",
  code: `aws eks update-kubeconfig --region ${REGION_TOKEN} --name ${CLUSTER_NAME_TOKEN}`,
};

const DOWNLOAD_KUBECTL_STEP: Omit<OsSetupStep, "id"> = {
  title: "Download kubectl",
  code: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
};

const CHMOD_KUBECTL_STEP: Omit<OsSetupStep, "id"> = {
  title: "Make kubectl executable",
  code: "chmod +x kubectl",
};

const MOVE_KUBECTL_STEP: Omit<OsSetupStep, "id"> = {
  title: "Move kubectl to system path",
  code: "sudo mv ./kubectl /usr/local/bin/kubectl",
};

const VERIFY_KUBECTL_STEP: Omit<OsSetupStep, "id"> = {
  title: "Verify kubectl",
  code: "kubectl version --client",
};

const VERIFY_AWS_CLI_STEP: Omit<OsSetupStep, "id"> = {
  title: "Verify AWS CLI",
  code: "aws --version",
};

// Per-OS ordered list of individual setup steps.
const OS_SETUP_STEPS: Record<ConnectOsId, Omit<OsSetupStep, "id">[]> = {
  "amazon-linux-2023": [
    { title: "Update system packages", code: "sudo dnf update -y\nsudo dnf upgrade -y" },
    VERIFY_AWS_CLI_STEP,
    DOWNLOAD_KUBECTL_STEP,
    CHMOD_KUBECTL_STEP,
    MOVE_KUBECTL_STEP,
    VERIFY_KUBECTL_STEP,
    UPDATE_KUBECONFIG_STEP,
  ],
  "ubuntu-26.04": [
    { title: "Update system packages", code: "sudo apt update\nsudo apt upgrade -y" },
    { title: "Install AWS CLI", code: "sudo apt install -y awscli" },
    VERIFY_AWS_CLI_STEP,
    DOWNLOAD_KUBECTL_STEP,
    CHMOD_KUBECTL_STEP,
    MOVE_KUBECTL_STEP,
    VERIFY_KUBECTL_STEP,
    UPDATE_KUBECONFIG_STEP,
  ],
  "rhel-10": [
    { title: "Update system packages", code: "sudo dnf update -y\nsudo dnf upgrade -y" },
    { title: "Install AWS CLI", code: "sudo dnf install -y awscli" },
    VERIFY_AWS_CLI_STEP,
    DOWNLOAD_KUBECTL_STEP,
    CHMOD_KUBECTL_STEP,
    MOVE_KUBECTL_STEP,
    VERIFY_KUBECTL_STEP,
    UPDATE_KUBECONFIG_STEP,
  ],
  "suse-linux-16": [
    { title: "Refresh package repositories", code: "sudo zypper refresh" },
    { title: "Install required tools", code: "sudo zypper install -y curl unzip jq" },
    { title: "Download AWS CLI", code: 'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"' },
    { title: "Extract AWS CLI", code: "unzip awscliv2.zip" },
    { title: "Install AWS CLI", code: "sudo ./aws/install" },
    VERIFY_AWS_CLI_STEP,
    DOWNLOAD_KUBECTL_STEP,
    CHMOD_KUBECTL_STEP,
    MOVE_KUBECTL_STEP,
    VERIFY_KUBECTL_STEP,
    UPDATE_KUBECONFIG_STEP,
  ],
  "debian-13": [
    { title: "Update system packages", code: "sudo apt update\nsudo apt upgrade -y" },
    VERIFY_AWS_CLI_STEP,
    DOWNLOAD_KUBECTL_STEP,
    CHMOD_KUBECTL_STEP,
    MOVE_KUBECTL_STEP,
    VERIFY_KUBECTL_STEP,
    UPDATE_KUBECONFIG_STEP,
  ],
  "windows-server-2025": [
    {
      title: "Install AWS CLI",
      note: "Open PowerShell as Administrator:",
      code: "msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi",
    },
    {
      title: "Add AWS CLI to PATH",
      note: "Open PowerShell as Administrator:",
      code: [
        '$awsPath = "C:\\Users\\Administrator\\AppData\\Local\\Programs\\Amazon\\AWSCLIV2"',
        "",
        "[Environment]::SetEnvironmentVariable(",
        '    "Path",',
        '    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + $awsPath,',
        '    "Machine"',
        ")",
      ].join("\n"),
    },
    {
      title: "Restart PowerShell",
      note: "Close PowerShell completely, open a new PowerShell window, then verify AWS CLI:",
      code: "aws --version",
    },
    {
      title: "Install kubectl",
      note: "Open PowerShell as Administrator:",
      code: [
        'New-Item -ItemType Directory -Force -Path "C:\\kubectl"',
        'curl.exe -L "https://dl.k8s.io/release/v1.36.0/bin/windows/amd64/kubectl.exe" -o "C:\\kubectl\\kubectl.exe"',
      ].join("\n"),
    },
    {
      title: "Add kubectl to PATH",
      note: "Open PowerShell as Administrator:",
      code: [
        '$kubectlPath = "C:\\kubectl"',
        "",
        "[Environment]::SetEnvironmentVariable(",
        '    "Path",',
        '    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + $kubectlPath,',
        '    "Machine"',
        ")",
      ].join("\n"),
    },
    {
      title: "Restart PowerShell",
      note: "Close PowerShell completely, open a new PowerShell window, then verify:",
      code: "kubectl version --client",
    },
    UPDATE_KUBECONFIG_STEP,
  ],
};

/** Returns the ordered, per-OS setup steps with {{REGION}}/{{CLUSTER_NAME}} resolved. */
export function getOsSetupSteps(osId: ConnectOsId, ctx: ConnectContext): OsSetupStep[] {
  return OS_SETUP_STEPS[osId].map((step, index) => ({
    id: `${osId}-step-${index + 1}`,
    ...step,
    code: resolveCode(step.code, ctx),
  }));
}

/** The final verification step — kept as a single combined block, same as before. */
export function getVerifyConnectionStep(): OsSetupStep {
  return {
    id: "verify-connection",
    title: "Verify cluster access",
    code: ["kubectl get nodes", "kubectl get pods", "kubectl get deployments"].join("\n"),
  };
}

export function getAllCommandsForOs(osId: ConnectOsId, ctx: ConnectContext): string {
  const steps = [...getOsSetupSteps(osId, ctx), getVerifyConnectionStep()];
  return steps.map((s) => `# ${s.title}\n${s.code}`).join("\n\n");
}