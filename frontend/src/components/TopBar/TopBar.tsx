import { useState, useEffect, useRef } from "react";
import TopBarItem from "./TopBarItem";
import TopBarIcon from "./TopBarIcon";
import { RxCross1 } from "react-icons/rx";
import { IoIosSquareOutline } from "react-icons/io";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import SearchBar from "../../ui/SearchBar";
import { DropbarProviderContext } from "../../providers/DropbarContextProvider";
export default function TopBar() {
  const topBarItems = [
    "About",
    "File",
    "Edit",
    "Menu",
    "Terminal",
    "Help",
    "Run",
    "Synchronize",
  ];
  const [visibleItems, setVisibleItems] = useState<string[]>(topBarItems);
  const [showDots, setShowDots] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const iconsBarRef = useRef<HTMLDivElement>(null);
  const itemsRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const maxPossibleWidth = containerWidth * 0.25 - 40;
      let usedWidth = 0;
      const newVisible: string[] = [];
      for (let i = 0; i < topBarItems.length; i++) {
        const itemWidth = itemsRefs.current[i]?.offsetWidth || 60;
        if (usedWidth + itemWidth < maxPossibleWidth - 40) {
          usedWidth += itemWidth;
          newVisible.push(topBarItems[i]);
        } else break;
      }
      setVisibleItems(newVisible);
      setShowDots(newVisible.length < topBarItems.length);
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

  return (
    <div
      className="top-0 left-0 w-full h-10 bg-top-bar-bg grid grid-cols-[1fr_2fr_1fr] px-2 items-center"
      ref={containerRef}
    >
      <div className="flex items-center gap-3 justify-start flex-shrink-0">
        <img src="/logo.svg" alt="Logo" className="h-6 w-auto flex-shrink-0" />
        <DropbarProviderContext mode="only">
        <div className="flex items-center gap-0 flex-shrink-0 overflow-visible">
            {visibleItems.map((item) => (
              <TopBarItem
                key={item}
                id={item}
                label={item}
              />
            ))}
          {showDots && (
            <div className="text-lg px-1 select-none flex-shrink-0">⋯</div>
          )}
        </div>
        </DropbarProviderContext>
      </div>
      <div ref={searchBarRef} className="mx-4 flex justify-center">
        <SearchBar />
      </div>
      <div
        ref={iconsBarRef}
        className="flex items-center gap-3 flex-shrink-0 justify-end"
      >
        <TopBarIcon icon={TfiLayoutLineSolid} />
        <TopBarIcon icon={IoIosSquareOutline} />
        <TopBarIcon icon={RxCross1} />
      </div>
    </div>
  );
}
