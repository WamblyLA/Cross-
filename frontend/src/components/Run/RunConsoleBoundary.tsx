import { Component, type ReactNode, useEffect, useState } from "react";

type RunConsoleErrorBoundaryInnerProps = {
  children: ReactNode;
  onCrash: () => void;
};

type RunConsoleErrorBoundaryInnerState = {
  hasError: boolean;
};

const RECOVERY_TEXT = "Консоль запуска перезапускается...";

class RunConsoleErrorBoundaryInner extends Component<
  RunConsoleErrorBoundaryInnerProps,
  RunConsoleErrorBoundaryInnerState
> {
  state: RunConsoleErrorBoundaryInnerState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch() {
    this.props.onCrash();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-6">
          <div className="rounded-[14px] border border-default bg-editor px-5 py-4 text-sm text-secondary">
            {RECOVERY_TEXT}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type RunConsoleBoundaryProps = {
  sessionId: string | null;
  children: ReactNode;
};

export default function RunConsoleBoundary({
  sessionId,
  children,
}: RunConsoleBoundaryProps) {
  const [restartToken, setRestartToken] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    setIsRecovering(false);
  }, [sessionId]);

  useEffect(() => {
    if (!isRecovering) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRestartToken((current) => current + 1);
      setIsRecovering(false);
    }, 160);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isRecovering]);

  if (isRecovering) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-6">
        <div className="rounded-[14px] border border-default bg-editor px-5 py-4 text-sm text-secondary">
          {RECOVERY_TEXT}
        </div>
      </div>
    );
  }

  return (
    <RunConsoleErrorBoundaryInner
      key={`${sessionId ?? "empty"}:${restartToken}`}
      onCrash={() => {
        setIsRecovering(true);
      }}
    >
      {children}
    </RunConsoleErrorBoundaryInner>
  );
}
