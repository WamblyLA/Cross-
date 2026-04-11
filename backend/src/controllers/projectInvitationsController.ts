import type { Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  acceptProjectInvitation,
  createProjectInvitation,
  declineProjectInvitation,
  revokeProjectInvitation,
} from "../lib/projectInvitations.js";
import type {
  CreateProjectInvitationBody,
  InvitationActionParams,
  ProjectFilesParams,
  ProjectInvitationParams,
} from "../lib/validation.js";

function requireUserId(req: Request) {
  if (!req.userId) {
    throw new AppError("Требуется авторизация", 401, undefined, "UNAUTHORIZED");
  }

  return req.userId;
}

export async function createProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId } = req.params as ProjectFilesParams;
  const body = req.body as CreateProjectInvitationBody;
  const invitation = await createProjectInvitation({
    userId,
    projectId,
    email: body.email,
    role: body.role,
  });

  res.status(201).json({ invitation });
}

export async function revokeProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId, id } = req.params as ProjectInvitationParams;

  await revokeProjectInvitation({
    userId,
    projectId,
    invitationId: id,
  });

  res.status(204).send();
}

export async function acceptProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = req.params as InvitationActionParams;
  const result = await acceptProjectInvitation(userId, id);

  res.json(result);
}

export async function declineProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = req.params as InvitationActionParams;
  const result = await declineProjectInvitation(userId, id);

  res.json(result);
}
