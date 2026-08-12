import { env } from "@/lib/env";

export async function getVpcQuotaRequests() {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${env.vpcService}/vpc-quota/requests`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message);
  }

  return data;
}