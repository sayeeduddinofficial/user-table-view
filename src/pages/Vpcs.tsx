import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { VpcList } from "@/components/vpc/VpcList";
import { CreateVpc } from "@/components/vpc/CreateVpc";
import { VpcDetails } from "@/components/vpc/VpcDetails";

export default function Vpcs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vpcId } = useParams<{ vpcId: string }>();

  if (vpcId) {
    return <VpcDetails vpcId={vpcId} />;
  }

  if (location.pathname === "/aws/vpcs/create") {
    return (
      <div>
        <Header
          title="Create VPC"
          subtitle="Virtual networks for securely hosting cloud resources."
          showSearch={false}
        />
        <CreateVpc onClose={() => navigate("/aws/vpcs")} />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="VPCs"
        subtitle="Virtual networks for securely hosting cloud resources."
        showSearch={false}
      />
      <VpcList />
    </div>
  );
}
