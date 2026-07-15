import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";

export const vpcApi = {

  deleteMany(ids: string[]) {
    const store = useAppStore.getState();
    ids.forEach((id) => store.deleteVpc(id));
    toast.success(`Deleted ${ids.length} VPC(s)`);
  },

  reapplyMany(ids: string[]) {
    toast.info(`Re-applying ${ids.length} VPC(s)`);
  },

  copyTerraform(terraform: string) {
    navigator.clipboard.writeText(terraform || "");
    toast.success("Terraform copied");
  },

  createEncryptionControl() {
    toast.success("Encryption control created");
  },

  createFlowLog() {
    toast.success("Flow log created successfully");
  },
};