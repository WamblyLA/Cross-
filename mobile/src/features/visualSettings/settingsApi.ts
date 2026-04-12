import { request } from "../../lib/api/apiClient";
import type { VisualSettings } from "../../types/visualSettings";

type SettingsResponse = {
  settings: VisualSettings;
};

export function fetchSettings() {
  return request<SettingsResponse>({
    url: "/api/me/settings",
  });
}

export function updateSettings(payload: Partial<VisualSettings>) {
  return request<SettingsResponse, Partial<VisualSettings>>({
    url: "/api/me/settings",
    method: "PUT",
    body: payload,
  });
}
