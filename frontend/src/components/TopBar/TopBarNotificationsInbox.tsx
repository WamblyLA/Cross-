import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { FiMail } from "react-icons/fi";
import {
  selectNotificationsCount,
  selectNotificationsError,
  selectNotificationsItems,
  selectNotificationsStatus,
} from "../../features/notifications/notificationsSelectors";
import {
  markCollaborationActivityNotificationsRead,
} from "../../features/notifications/notificationsSlice";
import {
  acceptNotificationProjectInvitation,
  declineNotificationProjectInvitation,
  fetchNotifications,
} from "../../features/notifications/notificationsThunks";
import {
  getAcceptInvitationErrorMessage,
  getDeclineInvitationErrorMessage,
  getNotificationsLoadErrorMessage,
} from "../../features/notifications/notificationMessages";
import { normalizeApiError } from "../../lib/api/errorNormalization";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAnchoredPanelStyle } from "./topBarPanelPosition";

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 420;

export default function TopBarNotificationsInbox() {
  const dispatch = useAppDispatch();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const notifications = useAppSelector(selectNotificationsItems);
  const notificationsCount = useAppSelector(selectNotificationsCount);
  const notificationsStatus = useAppSelector(selectNotificationsStatus);
  const notificationsError = useAppSelector(selectNotificationsError);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    dispatch(markCollaborationActivityNotificationsRead());
    void dispatch(fetchNotifications());
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      setIsOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen]);

  const handleAccept = (invitationId: string) => {
    setPendingInvitationId(invitationId);
    setPendingAction("accept");
    setFeedback(null);

    void dispatch(acceptNotificationProjectInvitation({ invitationId }))
      .unwrap()
      .then(() => {
        setFeedback({
          type: "success",
          message: "Приглашение принято",
        });
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getAcceptInvitationErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => {
        setPendingInvitationId(null);
        setPendingAction(null);
      });
  };

  const handleDecline = (invitationId: string) => {
    setPendingInvitationId(invitationId);
    setPendingAction("decline");
    setFeedback(null);

    void dispatch(declineNotificationProjectInvitation({ invitationId }))
      .unwrap()
      .then(() => {
        setFeedback({
          type: "success",
          message: "Приглашение отклонено",
        });
      })
      .catch((error) => {
        setFeedback({
          type: "error",
          message: getDeclineInvitationErrorMessage(normalizeApiError(error)),
        });
      })
      .finally(() => {
        setPendingInvitationId(null);
        setPendingAction(null);
      });
  };

  const anchorRect = triggerRef.current?.getBoundingClientRect() ?? null;
  const panelStyle =
    isOpen && anchorRect
      ? getAnchoredPanelStyle(anchorRect, PANEL_WIDTH, PANEL_HEIGHT, "right")
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`ui-control relative flex h-8 w-8 items-center justify-center ${
          isOpen ? "border border-default bg-active text-primary" : ""
        }`}
        aria-label="Уведомления"
        title="Уведомления"
        onClick={() => {
          setFeedback(null);
          setIsOpen((currentValue) => !currentValue);
        }}
      >
        <FiMail className="h-4 w-4" />
        {notificationsCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[var(--accent)] px-1 text-[10px] font-medium text-[var(--bg-app)]">
            {notificationsCount > 9 ? "9+" : notificationsCount}
          </span>
        ) : null}
      </button>

      {isOpen && panelStyle && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[145]">
              <div
                ref={panelRef}
                className="ui-dialog pointer-events-auto fixed max-h-[420px] overflow-hidden"
                style={panelStyle}
              >
                <div className="border-b border-default px-4 py-3">
                  <div className="text-sm text-primary">Уведомления</div>
                </div>

                <div className="ui-scrollbar-thin max-h-[368px] overflow-y-auto p-4">
                  {feedback ? (
                    <div
                      className={`mb-3 rounded-[14px] border px-3 py-2 text-sm ${
                        feedback.type === "success"
                          ? "border-default bg-active text-primary"
                          : "border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] text-error"
                      }`}
                    >
                      {feedback.message}
                    </div>
                  ) : null}

                  {notificationsStatus === "loading" && notifications.length === 0 ? (
                    <div className="rounded-[14px] border border-default bg-panel px-4 py-4 text-sm text-secondary">
                      Загружаем уведомления...
                    </div>
                  ) : notificationsStatus === "failed" && notifications.length === 0 ? (
                    <div className="rounded-[14px] border border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] px-4 py-4 text-sm text-error">
                      {getNotificationsLoadErrorMessage(notificationsError)}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="rounded-[14px] border border-default bg-panel px-4 py-4 text-sm text-secondary">
                      Новых уведомлений нет
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notificationsStatus === "failed" ? (
                        <div className="rounded-[14px] border border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] px-4 py-3 text-sm text-error">
                          {getNotificationsLoadErrorMessage(notificationsError)}
                        </div>
                      ) : null}

                      {notifications.map((notification) => {
                        if (notification.type === "COLLABORATION_ACTIVITY") {
                          return (
                            <div
                              key={notification.id}
                              className="rounded-[16px] border border-default bg-panel px-4 py-4"
                            >
                              <div className="text-sm text-primary">Совместная работа</div>
                              <div className="mt-2 text-sm text-secondary">
                                <span className="text-primary">{notification.activity.projectName}</span>
                              </div>
                              <div className="mt-2 text-xs leading-5 text-secondary">
                                {notification.activity.message}
                              </div>
                              <div className="mt-2 text-xs text-muted">
                                {new Date(notification.activity.updatedAt).toLocaleString("ru-RU")}
                              </div>
                            </div>
                          );
                        }

                        const invitation = notification.invitation;
                        const isPending = pendingInvitationId === invitation.id;

                        return (
                          <div
                            key={notification.id}
                            className="rounded-[16px] border border-default bg-panel px-4 py-4"
                          >
                            <div className="text-sm text-primary">Приглашение в проект</div>
                            <div className="mt-2 text-sm text-secondary">
                              <span className="text-primary">{invitation.projectName}</span>
                            </div>
                            <div className="mt-2 text-xs leading-5 text-secondary">
                              {invitation.inviterUsername} пригласил вас как{" "}
                              {invitation.role === "editor" ? "редактора" : "наблюдателя"}.
                            </div>

                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                className="ui-button-primary ui-control h-9 px-3 text-sm"
                                disabled={isPending}
                                onClick={() => handleAccept(invitation.id)}
                              >
                                {isPending && pendingAction === "accept"
                                  ? "Принимаем..."
                                  : "Принять"}
                              </button>

                              <button
                                type="button"
                                className="ui-button-secondary ui-control h-9 px-3 text-sm"
                                disabled={isPending}
                                onClick={() => handleDecline(invitation.id)}
                              >
                                {isPending && pendingAction === "decline"
                                  ? "Отклоняем..."
                                  : "Отклонить"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
