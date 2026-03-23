import React, { useRef, useState } from "react";

interface ResizeableBlockProps {
  minWidth: number;
  maxWidth?: number;
  children: React.ReactNode;
  direction: "r" | "l" | "u" | "d";
  defaultWidth: number;
}

export default function ResizeableBlock({
  minWidth,
  maxWidth,
  children,
  direction,
  defaultWidth,
}: ResizeableBlockProps) {
  const resizeRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(defaultWidth);
  const isHorizontal = direction === "l" || direction === "r";
  const [isClosed, setIsClosed] = useState(false);

  const resizing = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startPosition = isHorizontal ? e.clientX : e.clientY;
    const startWidth = isClosed ? 0 : width;
    let wasClosed = isClosed;
    const barrier = 10;

    const mouseMovement = (moveEvent: MouseEvent) => {
      let difference = isHorizontal
        ? moveEvent.clientX - startPosition
        : moveEvent.clientY - startPosition;

      if (direction === "l" || direction === "u") {
        difference = -difference;
      }

      let newWidth = startWidth + difference;

      if (wasClosed && newWidth > minWidth / 2 + barrier) {
        setIsClosed(false);
        setWidth(minWidth);
        wasClosed = false;
        return;
      }

      if (!wasClosed && newWidth < minWidth / 2 - barrier) {
        setIsClosed(true);
        setWidth(0);
        wasClosed = true;
        return;
      }

      if (!wasClosed) {
        if (newWidth < minWidth) {
          newWidth = minWidth;
        }

        if (maxWidth && newWidth > maxWidth) {
          newWidth = maxWidth;
        }

        setWidth(newWidth);
      }
    };

    const mouseUp = () => {
      document.removeEventListener("mousemove", mouseMovement);
      document.removeEventListener("mouseup", mouseUp);
    };

    document.addEventListener("mousemove", mouseMovement);
    document.addEventListener("mouseup", mouseUp);
  };

  const grabberStyles =
    direction === "r"
      ? "ui-resize-handle absolute top-0 right-0 h-full w-1 cursor-ew-resize z-10"
      : direction === "l"
        ? "ui-resize-handle absolute top-0 left-0 h-full w-1 cursor-ew-resize z-10"
        : direction === "u"
          ? "ui-resize-handle absolute bottom-0 left-0 w-full h-1 cursor-ns-resize z-10"
          : "ui-resize-handle absolute top-0 left-0 w-full h-1 cursor-ns-resize z-10";

  return (
    <div
      className={`relative ${isClosed ? "" : "overflow-hidden"}`}
      style={{
        width: isHorizontal ? (isClosed ? "3px" : `${width}px`) : "100%",
        height: !isHorizontal ? (isClosed ? "3px" : `${width}px`) : "100%",
      }}
    >
      {!isClosed ? <div className="w-full h-full">{children}</div> : null}
      <div className={grabberStyles} ref={resizeRef} onMouseDown={resizing} />
    </div>
  );
}
