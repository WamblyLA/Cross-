import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import {
  BugReportDeliveryError,
  sendBugReportToTelegram,
  type BugReportReporter,
} from "../lib/bugReports.js";
import type { BugReportBody } from "../lib/validation.js";

async function resolveReporter(userId: string | undefined): Promise<BugReportReporter> {
  if (!userId) {
    return { kind: "anonymous" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
    },
  });

  return {
    kind: "authenticated",
    userId,
    username: user?.username ?? null,
    email: user?.email ?? null,
  };
}

function logBugReportFailure(
  error: unknown,
  payload: BugReportBody,
  reporter: BugReportReporter,
) {
  const safeContext =
    error instanceof BugReportDeliveryError
      ? error.safeContext
      : {
          reason: "network_error" as const,
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        };

  console.error("[bug-report] Failed to send bug report", {
    reporter: reporter.kind,
    userId: reporter.kind === "authenticated" ? reporter.userId : null,
    titleLength: payload.title.length,
    descriptionLength: payload.description.length,
    ...safeContext,
  });
}

export async function createBugReport(req: Request, res: Response) {
  const payload = req.body as BugReportBody;
  const reporter = await resolveReporter(req.userId);

  try {
    await sendBugReportToTelegram({
      title: payload.title,
      description: payload.description,
      reporter,
      ...(req.get("user-agent") ? { userAgent: req.get("user-agent") } : {}),
    });
  } catch (error) {
    logBugReportFailure(error, payload, reporter);
    throw new AppError(
      "Не удалось отправить сообщение. Попробуйте позже.",
      500,
      undefined,
      "BUG_REPORT_FAILED",
    );
  }

  res.json({ success: true });
}
