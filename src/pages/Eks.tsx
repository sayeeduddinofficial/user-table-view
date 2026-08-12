import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CreateEks } from "@/components/eks/CreateEks";
import { EksDetails } from "@/components/eks/EksDetails";
import { EksList } from "@/components/eks/EksList";

export default function Eks() {
  const location = useLocation();
  const navigate = useNavigate();
  const { eksId } = useParams<{ eksId: string }>();

  if (eksId) {
    return <EksDetails eksId={eksId} />;
  }

  if (location.pathname === "/aws/eks/create") {
    return (
      <div>
        <Header
          title="Configure cluster"
          subtitle="Managed Kubernetes clusters for containerized applications."
          showSearch={false}
        />
        <CreateEks onClose={() => navigate("/aws/eks")} />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="EKS Clusters"
        subtitle="Managed Kubernetes clusters for containerized applications."
        showSearch={false}
      />
      <EksList />
    </div>
  );
}
