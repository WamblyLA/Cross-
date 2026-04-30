import { FiCloud } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function CloudAuthPrompt() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full items-center justify-center px-4 py-6">
      <div className="ui-panel w-full max-w-sm px-5 py-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-default bg-panel text-secondary">
          <FiCloud className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-base text-primary">Облачные проекты доступны после входа</h3>
        <p className="mt-2 text-sm leading-6 text-secondary">
          Войдите в аккаунт, чтобы создавать проекты в облаке, открывать их прямо в IDE и
          сохранять изменения в облаке.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="ui-control h-10 rounded-[10px] border border-default bg-active px-4 text-sm text-primary"
            onClick={() => navigate("/auth/login")}
          >
            Войти
          </button>
          <button
            type="button"
            className="ui-control h-10 rounded-[10px] px-4 text-sm"
            onClick={() => navigate("/auth/register")}
          >
            Создать аккаунт
          </button>
        </div>
      </div>
    </div>
  );
}
