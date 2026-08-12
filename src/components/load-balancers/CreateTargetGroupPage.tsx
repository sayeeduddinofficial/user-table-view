import type { ManagedTargetGroup } from "@/services/lbApi";
import type { VpcItem } from "@/services/lbApi";
import { RegisterTargetsStep } from "./RegisterTargetsStep";
import { ReviewAndCreateStep } from "./ReviewAndCreateStep";
import { TargetGroupDetailsStep } from "./target-groups/TargetGroupDetailsStep";
import { TARGET_TYPES } from "./targetGroup.constants";
import { useTargetGroupCreateForm } from "@/hooks/useTargetGroupCreateForm";

type Props = {
  isAlb: boolean;
  vpcList: VpcItem[];
  defaultVpcId?: string;
  region: string;
  userId: number;
  onCancel: () => void;
  onCreate: (tg: ManagedTargetGroup) => void;
};

export function CreateTargetGroupPage({ isAlb, vpcList, defaultVpcId, region, userId, onCancel, onCreate }: Props) {
  const form = useTargetGroupCreateForm({ isAlb, vpcList, defaultVpcId, region, userId, onCreate });

  const targetTypeLabel = TARGET_TYPES.find((t) => t.value === form.targetType)?.label ?? form.targetType;
  const vpcLabel = `${form.activeVpc.id} (${form.activeVpc.name})`;

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        {form.step === "register" ? (
          <RegisterTargetsStep
            region={region}
            vpcId={form.vpcId}
            defaultPort={form.port}
            pendingTargets={form.pendingTargets}
            onPendingTargetsChange={form.setPendingTargets}
            onCancel={onCancel}
            onPrevious={form.backToSettings}
            onNext={form.goToReview}
          />
        ) : form.step === "review" ? (
          <ReviewAndCreateStep
            name={form.name}
            targetTypeLabel={targetTypeLabel}
            protocol={form.protocol}
            port={form.port}
            showProtocolVersion={form.showProtocolVersion}
            protocolVersion={form.protocolVersion}
            vpcLabel={vpcLabel}
            ipAddressType={form.ipAddressType}
            healthCheckProtocol={form.healthCheckProtocol}
            showHealthCheckPath={form.showHealthCheckPath}
            healthCheckPath={form.healthCheckPath}
            pendingTargets={form.pendingTargets}
            onCancel={onCancel}
            onPrevious={form.goToRegisterTargets}
            onEditSettings={form.backToSettings}
            onEditTargets={form.goToRegisterTargets}
            onCreate={form.handleFinalCreate}
            isCreating={form.isCreating}
          />
        ) : (
          <TargetGroupDetailsStep
            targetType={form.targetType}
            onTargetTypeChange={form.setTargetType}
            name={form.name}
            onNameChange={form.setName}
            onNameBlur={() => form.setNameTouched(true)}
            nameError={form.nameError}
            nameCheckLoading={form.nameCheckLoading}
            nameExistsError={form.nameExistsError}
            region={region}
            protocol={form.protocol}
            onProtocolChange={form.setProtocol}
            protocolOptions={form.protocolOptions}
            port={form.port}
            onPortChange={form.setPort}
            ipAddressType={form.ipAddressType}
            onIpAddressTypeChange={form.setIpAddressType}
            activeVpc={form.activeVpc}
            vpcId={form.vpcId}
            onVpcIdChange={form.setVpcId}
            showProtocolVersion={form.showProtocolVersion}
            protocolVersion={form.protocolVersion}
            onProtocolVersionChange={form.setProtocolVersion}
            healthCheckProtocol={form.healthCheckProtocol}
            healthCheckProtocolOptions={form.healthCheckProtocolOptions}
            onHealthCheckProtocolChange={form.setHealthCheckProtocol}
            showHealthCheckPath={form.showHealthCheckPath}
            healthCheckPath={form.healthCheckPath}
            onHealthCheckPathChange={form.setHealthCheckPath}
            onHealthCheckPathTouched={() => form.setHealthCheckPathTouched(true)}
            healthCheckPathError={form.healthCheckPathError}
            onCancel={onCancel}
            onContinue={form.handleContinueToRegisterTargets}
          />
        )}
      </div>
    </div>
  );
}
