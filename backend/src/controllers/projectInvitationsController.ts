import type { Request, Response } from "express";
import {
  acceptProjectInvitation,
  createProjectInvitation,
  declineProjectInvitation,
  revokeProjectInvitation,
} from "../lib/projectInvitations.js";
import { requireUserId } from "../lib/requestContext.js";
import type {
  CreateProjectInvitationBody,
  InvitationActionParams,
  ProjectFilesParams,
  ProjectInvitationParams,
} from "../lib/validation.js";

export async function createProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
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
  const userId = requireUserId(req, "UNAUTHORIZED");
  const { projectId, id } = req.params as ProjectInvitationParams;

  await revokeProjectInvitation({
    userId,
    projectId,
    invitationId: id,
  });

  res.status(204).send();
}

export async function acceptProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
  const { id } = req.params as InvitationActionParams;
  const result = await acceptProjectInvitation(userId, id);

  res.json(result);
}

export async function declineProjectInvitationHandler(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
  const { id } = req.params as InvitationActionParams;
  const result = await declineProjectInvitation(userId, id);

  res.json(result);
}
