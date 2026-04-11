import type {
  PendingProjectInvitation,
  ProjectMemberRole,
} from "../../features/cloud/cloudTypes";

type PendingProjectInvitationsListProps = {
  invitations: PendingProjectInvitation[];
  pendingInvitationId: string | null;
  onRevoke: (invitationId: string) => void;
};

function getRoleLabel(role: Extract<ProjectMemberRole, "editor" | "viewer">) {
  return role === "editor" ? "Редактор" : "Наблюдатель";
}

export default function PendingProjectInvitationsList({
  invitations,
  pendingInvitationId,
  onRevoke,
}: PendingProjectInvitationsListProps) {
  return (
    <div className="rounded-[18px] border border-default bg-panel">
      <div className="border-b border-default px-4 py-3 text-sm text-primary">
        Ожидают ответа
      </div>

      {invitations.length === 0 ? (
        <div className="px-4 py-5 text-sm text-secondary">Пока нет активных приглашений</div>
      ) : (
        <div className="divide-y divide-default">
          {invitations.map((invitation) => {
            const isPending = pendingInvitationId === invitation.id;

            return (
              <div
                key={invitation.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-primary">{invitation.username}</div>
                  <div className="mt-1 truncate text-xs text-secondary">{invitation.email}</div>
                </div>

                <div className="flex flex-col justify-center text-sm text-secondary">
                  <span>{getRoleLabel(invitation.role)}</span>
                  <span className="mt-1 text-xs text-muted">
                    Отправлено {new Date(invitation.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="ui-button-secondary ui-control h-9 px-3 text-sm"
                    disabled={isPending}
                    onClick={() => onRevoke(invitation.id)}
                  >
                    {isPending ? "Отзываем..." : "Отозвать"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
