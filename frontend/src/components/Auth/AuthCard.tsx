import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="ui-panel w-full max-w-xl overflow-hidden">
      <div className="border-b border-default bg-active px-8 py-6">
        <div className="text-xs uppercase tracking-[0.24em] text-muted">Авторизация через cookie</div>
        <h1 className="mt-3 text-3xl text-primary">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">{description}</p>
      </div>

      <div className="flex flex-col gap-6 px-8 py-8">{children}</div>
    </div>
  );
}
