import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import {
  createCloudProjectInvitation,
  fetchProjectMembers,
  removeCloudProjectMember,
  revokeCloudProjectInvitation,
  updateCloudProjectMemberRole,
} from "../../features/cloud/cloudThunks";
import type {
  PendingProjectInvitation,
  ProjectMember,
  ProjectMemberRole,
} from "../../features/cloud/cloudTypes";
import {
  getCreateInvitationErrorMessage,
  getMembersLoadErrorMessage,
  getRemoveMemberErrorMessage,
  getRevokeInvitationErrorMessage,
  getUpdateMemberRoleErrorMessage,
} from "../../features/cloud/projectCollaborationMessages";
import { normalizeApiError } from "../../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import PendingProjectInvitationsList from "./PendingProjectInvitationsList";
import ProjectMemberInviteForm from "./ProjectMemberInviteForm";
import ProjectMembersList from "./ProjectMembersList";

type ProjectMembersDialogProps = {
  isOpen: boolean;
  projectId: string | null;
  onClose: () => void;
};

function sortMembers(members: ProjectMember[]) {
  return [...members].sort((left, right) => {
    if (left.isOwner && !right.isOwner) {
      return -1;
    }

    if (!left.isOwner && right.isOwner) {
      return 1;
    }

    return left.username.localeCompare(right.username, "ru");
  });
}

function sortInvitations(invitations: PendingProjectInvitation[]) {
  return [...invitations].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function validateEmail(email: string) {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Введите email пользователя";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Введите корректный email";
  }

  return null;
}

export default function ProjectMembersDialog({
  isOpen,
  projectId,
  onClose,
}: ProjectMembersDialogProps) {
  const dispatch = useAppDispatch();
  const project = useAppSelector((state) =>
    projectId ? state.cloud.projects.find((item) => item.id === projectId) ?? null : null,
  );
  const isOwnerView = project?.accessRole === "owner";
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingProjectInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Extract<ProjectMemberRole, "editor" | "viewer">>(
    "viewer",
  );
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "invite" | "role" | "removeMember" | "revokeInvitation" | null
  >(null);

  const title = useMemo(() => {
    if (!project) {
      return "Участники проекта";
    }

    return `Участники проекта: ${project.name}`;
  }, [project]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    void dispatch(fetchProjectMembers({ projectId }))
      .unwrap()
      .then((response) => {
        setMembers(sortMembers(response.members));
        setPendingInvitations(sortInvitations(response.pendingInvitations));
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getMembersLoadErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => setIsLoading(false));
  }, [dispatch, isOpen, projectId]);

  useEffect(() => {
    if (!isOpen) {
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteEmailError(null);
      setFeedback(null);
      setMembers([]);
      setPendingInvitations([]);
      setPendingMemberId(null);
      setPendingInvitationId(null);
      setPendingAction(null);
    }
  }, [isOpen]);

  if (!isOpen || !projectId || typeof document === "undefined") {
    return null;
  }

  const handleInviteSubmit = () => {
    const validationError = validateEmail(inviteEmail);

    setInviteEmailError(validationError);
    setFeedback(null);

    if (validationError) {
      return;
    }

    setPendingAction("invite");
    void dispatch(
      createCloudProjectInvitation({
        projectId,
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    )
      .unwrap()
      .then((response) => {
        setPendingInvitations((current) =>
          sortInvitations([
            ...current.filter((invitation) => invitation.id !== response.invitation.id),
            response.invitation,
          ]),
        );
        setInviteEmail("");
        setInviteRole("viewer");
        setFeedback({
          type: "success",
          message: "Приглашение отправлено",
        });
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getCreateInvitationErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => setPendingAction(null));
  };

  const handleRoleChange = (
    memberId: string,
    role: Extract<ProjectMemberRole, "editor" | "viewer">,
  ) => {
    setPendingMemberId(memberId);
    setPendingAction("role");
    setFeedback(null);

    void dispatch(
      updateCloudProjectMemberRole({
        projectId,
        memberId,
        role,
      }),
    )
      .unwrap()
      .then((response) => {
        setMembers((current) =>
          sortMembers(
            current.map((member) =>
              member.id === response.member.id ? response.member : member,
            ),
          ),
        );
        setFeedback({
          type: "success",
          message: "Права доступа обновлены",
        });
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getUpdateMemberRoleErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => {
        setPendingMemberId(null);
        setPendingAction(null);
      });
  };

  const handleRemove = (memberId: string) => {
    setPendingMemberId(memberId);
    setPendingAction("removeMember");
    setFeedback(null);

    void dispatch(removeCloudProjectMember({ projectId, memberId }))
      .unwrap()
      .then(() => {
        setMembers((current) => current.filter((member) => member.id !== memberId));
        setFeedback({
          type: "success",
          message: "Пользователь удалён",
        });
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getRemoveMemberErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => {
        setPendingMemberId(null);
        setPendingAction(null);
      });
  };

  const handleRevokeInvitation = (invitationId: string) => {
    setPendingInvitationId(invitationId);
    setPendingAction("revokeInvitation");
    setFeedback(null);

    void dispatch(revokeCloudProjectInvitation({ projectId, invitationId }))
      .unwrap()
      .then(() => {
        setPendingInvitations((current) =>
          current.filter((invitation) => invitation.id !== invitationId),
        );
        setFeedback({
          type: "success",
          message: "Приглашение отозвано",
        });
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getRevokeInvitationErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => {
        setPendingInvitationId(null);
        setPendingAction(null);
      });
  };

  return createPortal(
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/45 px-4">
      <div className="ui-dialog flex max-h-[88vh] w-[min(100%,920px)] min-w-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-default px-5 py-4">
          <div>
            <div className="ui-eyebrow">Совместная работа</div>
            <div className="text-base text-primary">{title}</div>
          </div>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={onClose}
            title="Закрыть"
          >
            <VscChromeClose />
          </button>
        </div>

        <div className="ui-scrollbar-thin min-h-0 overflow-y-auto p-5">
          {feedback ? (
            <div
              className={`mb-4 rounded-[14px] border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-default bg-active text-primary"
                  : "border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] text-error"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          {!isOwnerView ? (
            <div className="mb-4 rounded-[14px] border border-default bg-panel px-4 py-3 text-sm text-secondary">
              У вас нет прав на управление участниками. Доступен только просмотр состава проекта
            </div>
          ) : null}

          {isOwnerView ? (
            <div className="mb-4">
              <ProjectMemberInviteForm
                email={inviteEmail}
                role={inviteRole}
                emailError={inviteEmailError}
                isSubmitting={pendingAction === "invite"}
                onEmailChange={(value) => {
                  setInviteEmail(value);
                  if (inviteEmailError) {
                    setInviteEmailError(null);
                  }
                }}
                onRoleChange={setInviteRole}
                onSubmit={handleInviteSubmit}
              />
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-[18px] border border-default bg-panel px-4 py-5 text-sm text-secondary">
              Загружаем участников проекта...
            </div>
          ) : (
            <div className="space-y-4">
              <ProjectMembersList
                members={members}
                isOwnerView={Boolean(isOwnerView)}
                pendingMemberId={pendingMemberId}
                pendingAction={
                  pendingAction === "role" || pendingAction === "removeMember"
                    ? pendingAction === "removeMember"
                      ? "remove"
                      : "role"
                    : null
                }
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
              />

              {isOwnerView ? (
                <PendingProjectInvitationsList
                  invitations={pendingInvitations}
                  pendingInvitationId={pendingInvitationId}
                  onRevoke={handleRevokeInvitation}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
