import { useEffect, useMemo, useState } from "react";
import { Copy, Check, ExternalLink, KeyRound, Info, Terminal, Network } from "lucide-react";
import type { RequestConnectPayload, InstanceConnectPayload, ConnectInstanceRow } from "@/components/vms/myVMsApi";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CommandBlock, useCopyToClipboard } from "@/components/eks/eksShared";
import { useSSHKeys } from "@/hooks/useSSHKeys";
import { VM, roleMap, statusConfig, inferCategory } from "@/utils/myVMs.utils";


function StepBadge({ step, title }: { step: number; title: string;}) {
    return (
        <div className="flex items-start gap-2.5 mb-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-400">
                {step}
            </span>
            <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{title}</div>
            </div>
        </div>
    );
}

function SplunkUrlRow({ vm }: { vm: VM }) {
    const { copied, copy } = useCopyToClipboard();
    const url = vm.splunkUrl?.trim();

    if (!url) return null;

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{vm.name}</div>
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">
                    {url}
                </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs text-muted-foreground"
                    onClick={() => copy(url)}
                >
                    {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    Copy
                </Button>
                <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink size={14} />
                </a>
            </div>
        </div>
    );
}


const SPLUNK_WEB_ROLE_IDS = new Set(["sh", "idx", "cm", "ds", "hf", "uf", "lm"]);
const CLUSTER_CATEGORIES = new Set([3, 4, 5]);
const DEFAULT_SSH_USER = "ec2-user";

interface ConnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: string;
    vms: VM[];
    category?: number;
    connectData?: RequestConnectPayload | InstanceConnectPayload;
}

function sshCommand(vm: VM, keyName: string, sshUser = DEFAULT_SSH_USER) {
    if (!vm.publicIp || !keyName || vm.status !== "running") return "";
    return `ssh -i ${keyName} ${sshUser}@${vm.publicIp}`;
}

function toDialogVm(row: ConnectInstanceRow, fallback: Partial<VM> = {}): VM {
    return {
        id: fallback.id ?? 0,
        instanceId: row.instanceId,
        name: row.name,
        role: fallback.role ?? "",
        instanceType: row.type ?? fallback.instanceType ?? "",
        publicIp: row.publicIp ?? fallback.publicIp ?? null,
        privateIp: row.privateIp ?? fallback.privateIp ?? null,
        status: row.status ?? fallback.status ?? "running",
        requestId: fallback.requestId ?? "",
        userId: fallback.userId ?? 0,
        region: fallback.region ?? "",
        launchedAt: fallback.launchedAt ?? null,
        stop_time: fallback.stop_time ?? null,
        base_stop_time: fallback.base_stop_time ?? null,
        environment: fallback.environment ?? null,
        createdAt: fallback.createdAt ?? new Date().toISOString(),
        workspace: fallback.workspace ?? null,
        amiId: fallback.amiId ?? null,
        amiName: fallback.amiName ?? null,
        availabilityZone: row.availabilityZone ?? fallback.availabilityZone ?? null,
        roleKey: fallback.roleKey ?? "",
        provisionMode: fallback.provisionMode ?? null,
        splunkUrl: row.splunkUrl ?? null,
    } as VM;
}

export function ConnectDialog({ open, onOpenChange, requestId, vms, category, connectData }: ConnectDialogProps) {
    const dataVms = useMemo(() => {
        if (!connectData) return vms;
        if ("instances" in connectData && Array.isArray(connectData.instances)) {
            return connectData.instances.map((row) => toDialogVm(row, vms.find((vm) => vm.instanceId === row.instanceId) ?? {}));
        }
        if ("instance" in connectData && connectData.instance) {
            return [toDialogVm(connectData.instance, vms[0] ?? {})];
        }
        return vms;
    }, [connectData, vms]);

    const region = connectData?.region ?? dataVms[0]?.region ?? vms[0]?.region;
    const resolvedCategory = connectData?.category ?? category ?? inferCategory(dataVms);
    const { keys: sshKeys } = useSSHKeys();
    const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
    useEffect(() => {
        if (!selectedKeyId && sshKeys.length > 0) setSelectedKeyId(sshKeys[0].id);
    }, [sshKeys, selectedKeyId]);
    const selectedKey = sshKeys.find((k) => k.id === selectedKeyId);
    const keyPairName = connectData?.keyPair || (selectedKey ? `${selectedKey.name}.pem` : '');
    const sshUser = connectData?.sshUser || DEFAULT_SSH_USER;

    const accessibleVms = useMemo(
        () => dataVms.filter((vm) => vm.publicIp && vm.status === "running"),
        [dataVms],
    );
    const splunkVms = useMemo(
        () => dataVms.filter((vm) => {
            const url = vm.splunkUrl?.trim();
            return !!url && vm.status !== "stopped" && vm.status !== "terminated";
        }),
        [dataVms],
    );
    const installsSplunk = resolvedCategory !== 1;
    const isCluster = CLUSTER_CATEGORIES.has(resolvedCategory);
    const isAlbFronted = resolvedCategory === 5;
    const albData = connectData?.alb ?? null;

    let step = 1;
    const instanceStep = step++;
    const accessStep = step++;
    const splunkUrlStep = installsSplunk ? step++ : null;
    const loginStep = installsSplunk ? step++ : null;
    const albStep = isAlbFronted ? step++ : null;
    const noticeStep = isCluster ? step++ : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="
          w-[calc(100vw-32px)]
          max-w-[760px]
          max-h-[85vh]
          overflow-y-auto
          p-0
          gap-0

          bg-background
          text-foreground
          border
          border-border
          shadow-2xl

          dark:bg-[#0b0e14]
          dark:border-[#252b36]

          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-gray-300
          [&::-webkit-scrollbar-thumb:hover]:bg-gray-400
          dark:[&::-webkit-scrollbar-thumb]:bg-[#2b313c]
          dark:[&::-webkit-scrollbar-thumb:hover]:bg-[#3a4250]
        "
                style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
            >
                <DialogHeader className="border-b px-5 pt-5 pb-4 border-gray-200 dark:border-[#1d232d]">
                    <DialogTitle className="text-lg font-semibold">Connect to EC2</DialogTitle>
                    <div className="text-sm text-muted-foreground">
                        {requestId}
                        {region && (
                            <>
                                <span className="mx-1.5">•</span>
                                {region}
                            </>
                        )}
                        <span className="mx-1.5">•</span>
                        Category {resolvedCategory}
                        <span className="mx-1.5">•</span>
                        {dataVms.length} instance{dataVms.length === 1 ? "" : "s"}
                    </div>
                </DialogHeader>

                <div className="px-5 py-4 space-y-5">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <KeyRound size={13} />
                            Key pair
                            {sshKeys.length > 1 ? (
                                <Select value={selectedKeyId ?? undefined} onValueChange={setSelectedKeyId}>
                                    <SelectTrigger className="h-6 w-auto gap-1.5 border-none bg-transparent px-1.5 py-0 font-mono text-xs text-foreground shadow-none">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sshKeys.map((k) => (
                                            <SelectItem key={k.id} value={k.id} className="font-mono text-xs">
                                                {k.name}.pem
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="font-mono text-foreground">{keyPairName}</span>
                            )}
                            <span className="mx-0.5">•</span>
                            SSH user <span className="font-mono text-foreground">{DEFAULT_SSH_USER}</span>
                        </div>
                    </div>

                    {/* Instance details */}
                    <section>
                        <StepBadge step={instanceStep} title="Instance details" />
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                                        {["Name", "Instance ID", "Type", "Public IP", "Private IP", "Status"].map((c) => (
                                            <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataVms.map((vm) => (
                                        <tr key={vm.instanceId} className="border-b border-border/40 last:border-0">
                                            <td className="px-3 py-2.5 font-medium">{vm.name}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{vm.instanceId}</td>
                                            <td className="px-3 py-2.5 text-muted-foreground">{vm.instanceType ?? "—"}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-primary">{vm.publicIp || "—"}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{vm.privateIp || "—"}</td>
                                            <td className="px-3 py-2.5">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${(statusConfig[vm.status] ?? statusConfig.unknown).color
                                                        }`}
                                                >
                                                    {(statusConfig[vm.status] ?? statusConfig.unknown).label}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* VM access */}
                    <section>
                        <StepBadge step={accessStep} title="VM access"  />
                        {accessibleVms.length > 0 ? (
                            <>
                                <div className="space-y-2">
                                    {accessibleVms.map((vm) => (
                                        <CommandBlock
                                            key={vm.instanceId}
                                            label={`${vm.name} — ${vm.role}`}
                                            code={sshCommand(vm, keyPairName, sshUser)}
                                            icon={<Terminal size={13} className="text-blue-400" />}
                                        />
                                    ))}
                                </div>
                              
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No instances with a public IP yet.</p>
                        )}
                    </section>

                    {/* Splunk Web URLs */}
                    {splunkUrlStep && (
                        <section>
                            <StepBadge step={splunkUrlStep} title="Splunk Web URLs"  />
                            {splunkVms.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {splunkVms.map((vm) => (
                                        <SplunkUrlRow key={vm.instanceId} vm={vm} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No web-accessible instances in this view.</p>
                            )}
                        </section>
                    )}

                    {/* Splunk login details */}
                    {loginStep && (
                        <section>
                            <StepBadge step={loginStep} title="Splunk login details" />
                            <CommandBlock
                                label="Default credentials"
                                code={"USERNAME : admin\nPASSWORD : Splunk@123\nNOTE     : Temporary password. Please change after first login."}
                                icon={<Terminal size={13} className="text-blue-400" />}
                            />
                        </section>
                    )}

                    {/* ALB / DNS access */}
                    {albStep && (
                        <section>
                            <StepBadge step={albStep} title="ALB / DNS access" />
                            {albData && (albData.url || albData.dns || albData.dnsRecord || albData.targetGroup || (albData.shcNodes && albData.shcNodes.length)) ? (
                                <div className="flex gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-3">
                                    <Network size={16} className="text-primary shrink-0 mt-[2px]" />
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {albData.url && (
                                            <div>
                                                <span className="font-medium text-foreground">URL:</span>{" "}
                                                <a href={albData.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                                                    {albData.url}
                                                </a>
                                            </div>
                                        )}
                                        {albData.dns && (
                                            <div>
                                                <span className="font-medium text-foreground">ALB DNS:</span>{" "}
                                                <span className="font-mono text-xs break-all">{albData.dns}</span>
                                            </div>
                                        )}
                                        {albData.dnsRecord && (
                                            <div>
                                                <span className="font-medium text-foreground">DNS record:</span>{" "}
                                                <span className="font-mono text-xs break-all">{albData.dnsRecord}</span>
                                            </div>
                                        )}
                                        {albData.targetGroup && (
                                            <div>
                                                <span className="font-medium text-foreground">Target group:</span>{" "}
                                                <span className="font-mono text-xs break-all">{albData.targetGroup}</span>
                                            </div>
                                        )}
                                        {albData.shcNodes && albData.shcNodes.length > 0 && (
                                            <div>
                                                <span className="font-medium text-foreground">SHC nodes:</span>{" "}
                                                <span className="font-mono text-xs break-all">{albData.shcNodes.join(", ")}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                                    <Network size={16} className="text-primary shrink-0 mt-[2px]" />
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        No ALB / DNS entry available for this request yet.
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Deployment notice */}
                    {noticeStep && (
                        <section>
                            <StepBadge step={noticeStep} title="Deployment notice" />
                            <div className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
                                <Info size={16} className="text-amber-400 shrink-0 mt-[2px]" />
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Cluster deployment detected. Splunk services may take 5–10 minutes to fully initialize.
                                </p>
                            </div>
                        </section>

                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
