import type { ProjectMemberRole } from "../../features/cloud/cloudTypes";

type ProjectMemberInviteFormProps = {
  email: string;
  role: Extract<ProjectMemberRole, "editor" | "viewer">;
  emailError: string | null;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onRoleChange: (role: Extract<ProjectMemberRole, "editor" | "viewer">) => void;
  onSubmit: () => void;
};

export default function ProjectMemberInviteForm({
  email,
  role,
  emailError,
  isSubmitting,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: ProjectMemberInviteFormProps) {
  return (
    <div className="rounded-[18px] border border-default bg-panel px-4 py-4">
      <div className="text-sm text-primary">Пригласить пользователя</div>
      <div className="mt-1 text-xs leading-5 text-secondary">
        Отправьте приглашение по электронной почте и сразу назначьте права доступа к проекту.
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <div className="min-w-0">
          <input
            type="email"
            className="ui-input w-full px-3 py-2"
            value={email}
            placeholder="Электронная почта пользователя"
            disabled={isSubmitting}
            onChange={(event) => onEmailChange(event.target.value)}
          />
          {emailError ? <div className="mt-2 text-xs text-error">{emailError}</div> : null}
        </div>

        <select
          className="ui-input px-3 py-2"
          value={role}
          disabled={isSubmitting}
          onChange={(event) =>
            onRoleChange(event.target.value as Extract<ProjectMemberRole, "editor" | "viewer">)
          }
        >
          <option value="editor">Редактор</option>
          <option value="viewer">Наблюдатель</option>
        </select>

        <button
          type="button"
          className="ui-button-primary ui-control h-10 px-4 text-sm"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Отправляем..." : "Отправить"}
        </button>
      </div>
    </div>
  );
}
