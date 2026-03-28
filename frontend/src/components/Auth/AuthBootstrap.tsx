import { useEffect, type ReactNode } from "react";
import { selectSessionStatus } from "../../features/auth/authSelectors";
import { restoreSession } from "../../features/auth/authThunks";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

function LoadingGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-6">
      <div className="ui-panel w-full max-w-sm px-6 py-8 text-center">
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Cross++</div>
        <h1 className="mt-3 text-xl text-primary">Восстанавливаем сессию</h1>
        <p className="mt-2 text-sm leading-6 text-secondary">
          Проверяем текущую cookie-сессию перед тем, как отрисовать рабочее пространство.
        </p>
      </div>
    </div>
  );
}

export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const sessionStatus = useAppSelector(selectSessionStatus);

  useEffect(() => {
    if (sessionStatus === "idle") {
      void dispatch(restoreSession());
    }
  }, [dispatch, sessionStatus]);

  if (sessionStatus === "idle" || sessionStatus === "checking") {
    return <LoadingGate />;
  }

  return <>{children}</>;
}
