import { useEffect, useMemo, useState } from "react";
import { clearActionError } from "../../features/auth/authSlice";
import type { AuthUser } from "../../features/auth/authTypes";
import { getApiErrorDetail } from "../../lib/api/errorNormalization";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch } from "../../store/hooks";
import InputField from "../../ui/InputField";
import PrimaryButton from "../../ui/PrimaryButton";

type ProfileSectionProps = {
  user: AuthUser;
};

const USERNAME_PATTERN = /^[\p{L}\p{N}]+(?:[ .'-][\p{L}\p{N}]+)*$/u;

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateUsername(value: string) {
  const normalizedValue = normalizeUsername(value);

  if (!normalizedValue) {
    return "Введите имя.";
  }

  if (normalizedValue.length < 3) {
    return "Используйте не менее 3 символов.";
  }

  if (normalizedValue.length > 32) {
    return "Используйте не более 32 символов.";
  }

  if (!USERNAME_PATTERN.test(normalizedValue)) {
    return "Используйте буквы, цифры, пробел, точку, апостроф или дефис.";
  }

  return undefined;
}

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
  const dispatch = useAppDispatch();
  const { authPending, actionError, updateProfile } = useAuth();
  const [username, setUsername] = useState(user.username);

  useEffect(() => {
    setUsername(user.username);
  }, [user.username]);

  const usernameError = useMemo(
    () => validateUsername(username) ?? getApiErrorDetail(actionError?.details, "username"),
    [actionError?.details, username],
  );

  const hasChanges = normalizeUsername(username) !== user.username;
  const hasServerUsernameError = Boolean(getApiErrorDetail(actionError?.details, "username"));
  const generalError = actionError && !hasServerUsernameError ? actionError.message : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearActionError());

    const nextUsername = normalizeUsername(username);

    if (validateUsername(nextUsername)) {
      return;
    }

    await updateProfile({ username: nextUsername }).unwrap().catch(() => {
      // Ошибка уже отображается из store.
    });
  };

  return (
    <section className="ui-panel h-full overflow-hidden">
      <div className="border-b border-default px-6 py-4">
        <h2 className="text-lg text-primary">Профиль</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
        <InputField
          label="Имя"
          value={username}
          onChange={(nextValue) => {
            dispatch(clearActionError());
            setUsername(nextValue);
          }}
          error={usernameError}
          placeholder="Иван Иванов"
        />

        <ReadOnlyField label="Email" value={user.email} />

        {generalError ? <div className="text-sm text-error">{generalError}</div> : null}

        <div className="flex justify-start">
          <PrimaryButton
            type="submit"
            disabled={authPending || Boolean(usernameError) || !hasChanges}
            className="h-11 justify-center"
          >
            {authPending ? "Сохраняем..." : "Сохранить"}
          </PrimaryButton>
        </div>
      </form>
    </section>
  );
}