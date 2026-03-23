import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import { IoIosSquareOutline } from "react-icons/io";
import { RxCross1 } from "react-icons/rx";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import { DropbarProviderContext } from "../../providers/DropbarContextProvider";
import type { ThemeName } from "../../styles/tokens";
import { useRequest } from "../../hooks/useRequest";
import SearchBar from "../../ui/SearchBar";
import DotsMenu from "./DotsMenu";
import TopBarIcon from "./TopBarIcon";
import TopBarItem from "./TopBarItem";

type TopBarProps = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
  };
};

export default function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const navigate = useNavigate();

  const topBarItems = ["About", "File", "Edit", "Menu", "Terminal", "Help", "Run"];

  const mockData = ["Lorem", "Ipsum", "Dolor", "Sit", "Amet"];
  const [visibleItems, setVisibleItems] = useState<string[]>(topBarItems);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [showDots, setShowDots] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data: meData, refetch: refetchMe } = useRequest<MeResponse>({
    url: "http://localhost:3000/api/auth/me",
    auto: true,
    retry: 0,
  });

  const { refetch: logoutRequest } = useRequest<{ success: true }>({
    url: "http://localhost:3000/api/auth/logout",
    method: "POST",
    auto: false,
  });

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const maxPossibleWidth = containerWidth * 0.35 - 40;
      let usedWidth = 0;
      const newVisible: string[] = [];
      const newHidden: string[] = [];

      for (let i = 0; i < topBarItems.length; i++) {
        const itemWidth = itemsRefs.current[i]?.offsetWidth || 60;
        if (usedWidth + itemWidth < maxPossibleWidth - 40) {
          usedWidth += itemWidth;
          newVisible.push(topBarItems[i]);
        } else {
          newHidden.push(topBarItems[i]);
        }
      }

      setVisibleItems(newVisible);
      setHiddenItems(newHidden);
      setShowDots(newHidden.length > 0);
    };

    const observer = new ResizeObserver(resize);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    resize();

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutRequest();
      await refetchMe();
      window.location.reload();
    } catch (err) {
      console.error("logout error", err);
    }
  };

  return (
    <div
      className="top-0 left-0 w-full h-10 bg-chrome border-b border-default grid grid-cols-[1fr_2fr_1fr] px-2 items-center"
      ref={containerRef}
    >
      <div className="flex items-center gap-1 justify-start flex-shrink-0 h-full min-w-0">
        <img src="/logo.svg" alt="Logo" className="h-6 w-auto flex-shrink-0" />
        <DropbarProviderContext mode="only">
          <div className="flex items-center gap-0 flex-shrink-0 overflow-visible h-full min-w-0">
            {visibleItems.map((item, index) => (
              <div
                key={item}
                ref={(el) => {
                  itemsRefs.current[index] = el;
                }}
              >
                <TopBarItem id={item} label={item} dir="down" data={mockData} />
              </div>
            ))}

            {showDots ? (
              <DotsMenu key="dots" id="dots">
                {hiddenItems.map((item) => (
                  <TopBarItem key={item} id={item} label={item} dir="right" data={mockData} />
                ))}
              </DotsMenu>
            ) : null}
          </div>
        </DropbarProviderContext>
      </div>

      <div className="mx-4 flex justify-center min-w-0">
        <SearchBar />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 justify-end">
        <button
          type="button"
          onClick={onToggleTheme}
          className="ui-button-secondary ui-control px-2 py-1 text-xs"
        >
          {theme === "dark" ? "Dark" : "Light"}
        </button>

        {meData?.user ? (
          <div className="flex items-center gap-2 text-sm min-w-0">
            <FiUser className="h-4 w-4 text-secondary" />
            <span className="text-secondary truncate max-w-36">{meData.user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="ui-control px-2 py-1 text-sm"
            >
              Выйти
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="ui-control px-2 py-1 text-sm"
          >
            Войти
          </button>
        )}

        <TopBarIcon
          icon={TfiLayoutLineSolid}
          onClick={() => window.electronAPI.minimizeWindow()}
        />
        <TopBarIcon
          icon={IoIosSquareOutline}
          onClick={() => window.electronAPI.toggleMaximizeWindow()}
        />
        <TopBarIcon icon={RxCross1} onClick={() => window.electronAPI.closeWindow()} />
      </div>
    </div>
  );
}
