import { useVMRequestForm } from "@/hooks/useVMRequestForm";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CategorySelectionSection } from "./form/CategorySelectionSection";
import { BasicDetailsSection } from "./form/BasicDetailsSection";
import { DeploymentModeSection } from "./form/DeploymentModeSection";
import { InfrastructureSettingsSection } from "./form/InfrastructureSettingsSection";
import { ScheduleSection } from "./form/ScheduleSection";
import { Category1RoleConfigSection } from "./form/Category1RoleConfigSection";
import { Category2AllInOneSection } from "./form/Category2AllInOneSection";
import { Category3InfraSection } from "./form/Category3InfraSection";
import { Category4InfraSection } from "./form/Category4InfraSection";
import { Category5InfraSection } from "./form/Category5InfraSection";
import { JustificationSection } from "./form/JustificationSection";
import { VMRequestConfirmDialog } from "./form/VMRequestConfirmDialog";
import type { Props } from "./vmRequest.types";

export function VMRequestForm({ onSubmit, isSubmitting = false }: Props) {
  const f = useVMRequestForm(onSubmit, isSubmitting);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <CategorySelectionSection
        visibleCategories={f.visibleCategories}
        category={f.category}
        setCategory={f.setCategory}
      />

      <BasicDetailsSection
        environmentTag={f.environmentTag}
        setEnvironmentTag={f.setEnvironmentTag}
        projectIdentifier={f.projectIdentifier}
        setProjectIdentifier={f.setProjectIdentifier}
        projectIdentifierError={f.projectIdentifierError}
        setProjectIdentifierError={f.setProjectIdentifierError}
        projectIdentifierRef={f.projectIdentifierRef}
        category={f.category}
        splunkVersion={f.splunkVersion}
        setSplunkVersion={f.setSplunkVersion}
        splunkVersionError={f.splunkVersionError}
        setSplunkVersionError={f.setSplunkVersionError}
        splunkVersionSectionRef={f.splunkVersionSectionRef}
        submitted={f.submitted}
      />

      <DeploymentModeSection
        deploymentMode={f.deploymentMode}
        setDeploymentMode={f.setDeploymentMode}
        region={f.region}
        setRegion={f.setRegion}
        selectedRegions={f.selectedRegions}
        setSelectedRegions={f.setSelectedRegions}
      />

      <InfrastructureSettingsSection
        category={f.category}
        region={f.region}
        ami={f.ami}
        setAmi={f.setAmi}
        selectedAmi={f.selectedAmi}
        diskSize={f.diskSize}
        setDiskSize={f.setDiskSize}
        sshKeys={f.sshKeys}
        sshKeysLoading={f.sshKeysLoading}
        sshKeysError={f.sshKeysError}
        selectedSSHKeyName={f.selectedSSHKeyName}
        setSelectedSSHKeyName={f.setSelectedSSHKeyName}
        sshKeyError={f.sshKeyError}
        setSshKeyError={f.setSshKeyError}
        submitted={f.submitted}
        sshKeySectionRef={f.sshKeySectionRef}
      />

      <ScheduleSection
        runtimePolicyInfo={f.runtimePolicyInfo}
        maxRuntimeHours={f.maxRuntimeHours}
        runtimeDuration={f.runtimeDuration}
        setRuntimeDuration={f.setRuntimeDuration}
        vmStopTime={f.vmStopTime}
      />

      {f.category === 1 && (
        <Category1RoleConfigSection
          vmMode={f.vmMode}
          resetVmConfiguration={f.resetVmConfiguration}
          newVMs={f.newVMs}
          remainingQuota={f.remainingQuota}
          isOverQuota={f.isOverQuota}
          roles={f.roles}
          updateRole={f.updateRole}
          defaultType={f.defaultType}
          allowedInstanceTypes={f.currentUser?.allowedInstanceTypes || []}
          isMacAmi={!!f.selectedAmi?.isMacOS}
          submitted={f.submitted}
          generalGroups={f.generalGroups}
          setGeneralGroups={f.setGeneralGroups}
          generalGroupErrors={f.generalGroupErrors}
          setGeneralGroupErrors={f.setGeneralGroupErrors}
          MAX_GENERAL_GROUPS={f.MAX_GENERAL_GROUPS}
        />
      )}

      {f.category === 2 && (
        <Category2AllInOneSection
          remainingQuota={f.remainingQuota}
          allInOneInstanceType={f.allInOneInstanceType}
          setAllInOneInstanceType={f.setAllInOneInstanceType}
          allowedInstanceTypes={f.currentUser?.allowedInstanceTypes || []}
        />
      )}

      {f.category === 3 && (
        <Category3InfraSection
          remainingQuota={f.remainingQuota}
          CATEGORY_3_TOTAL_VMS={f.CATEGORY_3_TOTAL_VMS}
        />
      )}

      {f.category === 4 && (
        <Category4InfraSection
          remainingQuota={f.remainingQuota}
          CATEGORY_4_TOTAL_VMS={f.CATEGORY_4_TOTAL_VMS}
        />
      )}

      {f.category === 5 && (
        <Category5InfraSection
          remainingQuota={f.remainingQuota}
          CATEGORY_4_TOTAL_VMS={f.CATEGORY_4_TOTAL_VMS}
          cat5InstanceTypes={f.cat5InstanceTypes}
          setCat5InstanceTypes={f.setCat5InstanceTypes}
          allowedInstanceTypes={f.currentUser?.allowedInstanceTypes || []}
        />
      )}

      <JustificationSection
        justificationRef={f.justificationRef}
        justification={f.justification}
        setJustification={f.setJustification}
        justificationTouched={f.justificationTouched}
        setJustificationTouched={f.setJustificationTouched}
        justificationError={f.justificationError}
        setJustificationError={f.setJustificationError}
        submitted={f.submitted}
      />

      {/* Submit */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => f.navigate("/requests")}>
            Cancel
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            onClick={f.onOpenDialog}
                            disabled={f.isDisabled}
                            className="min-w-[200px]"
                          >
                            Submit Request ({f.effectiveVMs} VMs)
                          </Button>
                        </span>
                      </TooltipTrigger>

                      {f.isDisabled && (
                        <TooltipContent side="bottom" sideOffset={8}>
                          <p>{f.tooltipMessage}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </TooltipTrigger>

              {f.isDisabled && (
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>{f.tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        <VMRequestConfirmDialog
          isDialogOpen={f.isDialogOpen}
          setIsDialogOpen={f.setIsDialogOpen}
          visibleCategories={f.visibleCategories}
          category={f.category}
          environmentTag={f.environmentTag}
          projectIdentifier={f.projectIdentifier}
          splunkVersion={f.splunkVersion}
          region={f.region}
          ami={f.ami}
          deploymentMode={f.deploymentMode}
          selectedRegions={f.selectedRegions}
          diskSize={f.diskSize}
          selectedSSHKeyName={f.selectedSSHKeyName}
          vmMode={f.vmMode}
          effectiveVMs={f.effectiveVMs}
          roleConfigs={f.roleConfigs}
          justification={f.justification}
          isSubmitting={isSubmitting}
          handleSubmit={f.handleSubmit}
        />

        {f.isOverQuota && (
          <div className="flex justify-end">
            <p className="text-sm text-destructive font-medium">
              ⚠ VM Quota exceeded. Contact admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}