import type { Request, Response } from "express";
import {
  createProjectLink,
  deleteProjectLink,
  listProjectLinks,
  updateProjectLinkSyncSummary,
} from "../lib/projectLinks.js";
import { requireUserId } from "../lib/requestContext.js";
import type {
  CreateProjectLinkBody,
  ProjectLinkParams,
  UpdateProjectLinkSyncSummaryBody,
} from "../lib/validation.js";

export async function getProjectLinks(req: Request, res: Response) {
  const userId = requireUserId(req);
  const links = await listProjectLinks(userId);
  res.json({ links });
}

export async function createProjectLinkHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const body = req.body as CreateProjectLinkBody;
  const link = await createProjectLink({
    userId,
    projectId: body.projectId,
    clientBindingKey: body.clientBindingKey,
    localRootLabel: body.localRootLabel,
  });

  res.status(201).json({ link });
}

export async function deleteProjectLinkHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = req.params as ProjectLinkParams;
  await deleteProjectLink(userId, id);
  res.status(204).send();
}

export async function updateProjectLinkSyncSummaryHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = req.params as ProjectLinkParams;
  const body = req.body as UpdateProjectLinkSyncSummaryBody;
  const updateInput = {
    userId,
    linkId: id,
    ...(body.lastSyncAt !== undefined ? { lastSyncAt: body.lastSyncAt } : {}),
    ...(body.lastSyncDirection !== undefined
      ? { lastSyncDirection: body.lastSyncDirection }
      : {}),
  };

  const link = await updateProjectLinkSyncSummary(updateInput);

  res.json({ link });
}
