import AccountPageHeader from "../components/account/AccountPageHeader";
import ProfileSection from "../components/account/ProfileSection";
import SettingsForm from "../components/account/SettingsForm";
import { useAuth } from "../hooks/useAuth";

export default function AccountPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="ui-scrollbar h-full overflow-y-auto bg-editor">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <AccountPageHeader />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ProfileSection user={user} />
          <SettingsForm />
        </div>
      </div>
    </div>
  );
}
