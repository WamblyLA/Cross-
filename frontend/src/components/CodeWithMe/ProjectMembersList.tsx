import type { ProjectMember, ProjectMemberRole } from "../../features/cloud/cloudTypes";

type ProjectMembersListProps = {
  members: ProjectMember[];
  isOwnerView: boolean;
  pendingMemberId: string | null;
  pendingAction: "role" | "remove" | null;
  onRoleChange: (
    memberId: string,
    role: Extract<ProjectMemberRole, "editor" | "viewer">,
  ) => void;
  onRemove: (memberId: string) => void;
};

function getRoleLabel(role: ProjectMemberRole) {
  switch (role) {
    case "owner":
      return "Владелец";
    case "editor":
      return "Редактор";
    default:
      return "Наблюдатель";
  }
}

export default function ProjectMembersList({
  members,
  isOwnerView,
  pendingMemberId,
  pendingAction,
  onRoleChange,
  onRemove,
}: ProjectMembersListProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-default bg-panel px-4 py-5 text-sm text-secondary">
        У проекта пока нет участников.
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-default bg-panel">
      <div className="border-b border-default px-4 py-3 text-sm text-primary">
        Участники проекта
      </div>

      <div className="divide-y divide-default">
        {members.map((member) => {
          const isPending = pendingMemberId === member.id;

          return (
            <div
              key={member.id}
              className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm text-primary">{member.username}</span>
                  {member.isOwner ? (
                    <span className="rounded-full border border-default px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted">
                      Владелец
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 truncate text-xs text-secondary">{member.email}</div>
              </div>

              <div className="flex items-center">
                {isOwnerView && !member.isOwner ? (
                  <select
                    className="ui-input w-full px-3 py-2"
                    value={member.role}
                    disabled={isPending}
                    onChange={(event) =>
                      onRoleChange(
                        member.id,
                        event.target.value as Extract<ProjectMemberRole, "editor" | "viewer">,
                      )
                    }
                  >
                    <option value="editor">Редактор</option>
                    <option value="viewer">Наблюдатель</option>
                  </select>
                ) : (
                  <span className="text-sm text-secondary">{getRoleLabel(member.role)}</span>
                )}
              </div>

              <div className="flex items-center justify-end">
                {isOwnerView && !member.isOwner ? (
                  <button
                    type="button"
                    className="ui-button-secondary ui-control h-9 px-3 text-sm"
                    disabled={isPending}
                    onClick={() => onRemove(member.id)}
                  >
                    {isPending && pendingAction === "remove" ? "Удаляем..." : "Удалить"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
