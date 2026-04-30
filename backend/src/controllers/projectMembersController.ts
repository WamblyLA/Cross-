import type { Request, Response } from "express";
import {
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
} from "../lib/projectMembers.js";
import { listPendingProjectInvitationsForOwnerView } from "../lib/projectInvitations.js";
import { requireUserId } from "../lib/requestContext.js";
import type {
  ProjectFilesParams,
  ProjectMemberParams,
  UpdateProjectMemberBody,
} from "../lib/validation.js";

export async function getProjectMembers(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
  const { projectId } = req.params as ProjectFilesParams;
  const [members, pendingInvitations] = await Promise.all([
    listProjectMembers(userId, projectId),
    listPendingProjectInvitationsForOwnerView(userId, projectId),
  ]);
  res.json({ members, pendingInvitations });
}

export async function updateProjectMember(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
  const { projectId, id } = req.params as ProjectMemberParams;
  const body = req.body as UpdateProjectMemberBody;
  const member = await updateProjectMemberRole({
    userId,
    projectId,
    memberId: id,
    role: body.role,
  });
  res.json({ member });
}

export async function deleteProjectMember(req: Request, res: Response) {
  const userId = requireUserId(req, "UNAUTHORIZED");
  const { projectId, id } = req.params as ProjectMemberParams;
  await removeProjectMember({
    userId,
    projectId,
    memberId: id,
  });
  res.status(204).send();
}
