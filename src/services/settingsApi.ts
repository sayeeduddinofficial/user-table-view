import { apiClient } from '@/lib/api';
import { env } from '@/lib/env';
import type {AwsConfigResponse,SaveAwsSettingsRequest,SaveAwsSettingsResponse,GetSystemSettingsResponse,SystemSettings,SystemSettingKey,UpdateSystemSettingResponse,} from '@/types/api';

const BASE = env.awsSettings;

// ─── AWS Settings ──────────────────────────────────────────────────────────

export const fetchAwsConfig = (): Promise<AwsConfigResponse> =>
  apiClient.get<AwsConfigResponse>(BASE, '/api/settings/aws');

export const saveAwsConfig = (data: SaveAwsSettingsRequest): Promise<SaveAwsSettingsResponse> =>
  apiClient.post<SaveAwsSettingsResponse>(BASE, '/api/settings/aws', data);

// ─── System Settings ───────────────────────────────────────────────────────

export const getSystemSettings = async (): Promise<SystemSettings> => {
  const res = await apiClient.get<GetSystemSettingsResponse>(BASE, '/api/settings/system');
  return res.settings;
};

export const updateSystemSetting = (
  key: SystemSettingKey,
  value: { enabled: boolean }
): Promise<UpdateSystemSettingResponse> =>
  apiClient.put<UpdateSystemSettingResponse>(BASE, `/api/settings/system/${key}`, { value });
