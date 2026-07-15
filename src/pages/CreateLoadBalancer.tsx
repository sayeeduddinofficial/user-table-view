import { Navigate, useParams } from "react-router-dom";
import { LoadBalancerCreate } from "@/components/load-balancers/LoadBalancerCreate";

const KIND_MAP = {
  alb: "ALB",
  nlb: "NLB",
} as const;

export default function CreateLoadBalancerPage() {
  const { kind } = useParams();
  if (!kind) {
    return <Navigate to="/aws/vpcs" replace />;
  }

  const normalized = kind.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(KIND_MAP, normalized)) {
    return <Navigate to="/aws/vpcs" replace />;
  }

  return <LoadBalancerCreate kind={KIND_MAP[normalized as keyof typeof KIND_MAP]} />;
}
