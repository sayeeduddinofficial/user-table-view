import axios from "axios";
import { env } from "@/lib/env";

export async function refreshTokenApi(): Promise<{ token: string } | null> {
  try {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return null;

    const response = await axios.post(
      `${env.auth}/api/auth/refresh-token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[refreshTokenApi] Error:', error.response?.data?.message || error.message);
    return null;
  }
}