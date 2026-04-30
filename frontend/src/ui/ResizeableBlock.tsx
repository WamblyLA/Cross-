import React, { useEffect, useState } from "react";

interface ResizeableBlockProps {
  minSize: number;
  maxSize?: number;
  children: React.ReactNode;
  direction: "r" | "l" | "u" | "d";
  defaultSize: number;
  size?: number;
  onSizeChange?: (nextSize: number) => void;
  collapsible?: boolean;
}

export default function ResizeableBlock({
  minSize,
  maxSize,
  children,
  direction,
  defaultSize,
  size,
  onSizeChange,
  collapsible = true,
}: ResizeableBlockProps) {
  const isHorizontal = direction === "l" || direction === "r";
  const isControlled = typeof size === "number";
  const [internalSize, setInternalSize] = useState(defaultSize);
  const [isClosed, setIsClosed] = useState(false);
  const currentSize = isControlled ? size : internalSize;

  useEffect(() => {
    if (typeof size !== "number") {
      return;
    }

    setInternalSize(size);
  }, [size]);

  const applySize = (nextSize: number) => {
    if (!isControlled) {
      setInternalSize(nextSize);
    }

    onSizeChange?.(nextSize);
  };

  const resizing = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startPosition = isHorizontal ? e.clientX : e.clientY;
    const startSize = isClosed ? 0 : currentSize;
    let wasClosed = isClosed;
    const barrier = 10;

    const mouseMovement = (moveEvent: MouseEvent) => {
      let difference = isHorizontal
        ? moveEvent.clientX - startPosition
        : moveEvent.clientY - startPosition;

      if (direction === "l" || direction === "u") {
        difference = -difference;
      }

      let nextSize = startSize + difference;

      if (collapsible && wasClosed && nextSize > minSize / 2 + barrier) {
        setIsClosed(false);
        applySize(minSize);
        wasClosed = false;
        return;
      }

      if (collapsible && !wasClosed && nextSize < minSize / 2 - barrier) {
        setIsClosed(true);
        applySize(0);
        wasClosed = true;
        return;
      }

      if (!wasClosed) {
        if (nextSize < minSize) {
          nextSize = minSize;
        }

        if (maxSize && nextSize > maxSize) {
          nextSize = maxSize;
        }

        applySize(nextSize);
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
          ? "ui-resize-handle absolute top-0 left-0 w-full h-1 cursor-ns-resize z-10"
          : "ui-resize-handle absolute bottom-0 left-0 w-full h-1 cursor-ns-resize z-10";

  return (
    <div
      className={`relative ${isClosed ? "" : "overflow-hidden"}`}
      style={{
        width: isHorizontal ? (isClosed ? "3px" : `${currentSize}px`) : "100%",
        height: !isHorizontal ? (isClosed ? "3px" : `${currentSize}px`) : "100%",
      }}
    >
      {!isClosed ? <div className="w-full h-full">{children}</div> : null}
      <div className={grabberStyles} onMouseDown={resizing} />
    </div>
  );
}
