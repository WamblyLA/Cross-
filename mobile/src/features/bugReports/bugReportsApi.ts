import { request } from "../../lib/api/apiClient";

export type BugReportPayload = {
  title: string;
  description: string;
};

export function submitBugReport(payload: BugReportPayload) {
  return request<{ success: true }, BugReportPayload>({
    url: "/api/bug-reports",
    method: "POST",
    body: payload,
  });
}
