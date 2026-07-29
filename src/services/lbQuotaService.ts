import { env } from "@/lib/env";

export async function getLbQuotaRequests() {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${env.vmRequest}/api/lb-quota`,
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

export async function approveLbQuotaRequest(id: number) {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${env.vmRequest}/api/lb-quota/${id}/approve`,
    {
      method: "POST",
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

export async function rejectLbQuotaRequest(
  id: number,
  admin_notes: string
) {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${env.vmRequest}/api/lb-quota/${id}/deny`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        admin_notes,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message);
  }

  return data;
}