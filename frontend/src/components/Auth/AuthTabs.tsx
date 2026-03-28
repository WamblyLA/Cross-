import { NavLink } from "react-router-dom";

const tabs = [
  {
    to: "/auth/login",
    label: "Вход",
  },
  {
    to: "/auth/register",
    label: "Регистрация",
  },
];

export default function AuthTabs() {
  return (
    <div className="flex gap-2 rounded-md border border-default bg-chrome p-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `ui-control flex-1 px-3 py-1.5 text-sm ${
              isActive ? "border border-default bg-active text-primary" : "text-secondary"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
