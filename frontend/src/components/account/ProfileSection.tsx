import type { AuthUser } from "../../features/auth/authTypes";

type ProfileSectionProps = {
  user: AuthUser;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-secondary">{label}</span>
      <input
        value={value}
        readOnly
        className="ui-input px-3 py-2.5 text-primary opacity-90"
        aria-readonly="true"
      />
    </div>
  );
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  return (
    <section className="ui-panel h-full overflow-hidden">
      <div className="border-b border-default px-6 py-4">
        <h2 className="text-lg text-primary">Профиль</h2>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        <ReadOnlyField label="Username" value={user.username} />
        <ReadOnlyField label="Email" value={user.email} />
      </div>
    </section>
  );
}
