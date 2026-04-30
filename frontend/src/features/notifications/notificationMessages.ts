import type { ApiError } from "../../lib/api/errorNormalization";

export function getNotificationsLoadErrorMessage(error: ApiError | null | undefined) {
  return error?.message || "Не удалось загрузить уведомления";
}

export function getAcceptInvitationErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось принять приглашение";
  }

  switch (error.code) {
    case "INVITATION_NOT_FOUND":
      return "Приглашение не найдено";
    case "INVITATION_NOT_PENDING":
      return "Приглашение больше не ожидает ответа";
    default:
      return "Не удалось принять приглашение";
  }
}

export function getDeclineInvitationErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось отклонить приглашение";
  }

  switch (error.code) {
    case "INVITATION_NOT_FOUND":
      return "Приглашение не найдено";
    case "INVITATION_NOT_PENDING":
      return "Приглашение больше не ожидает ответа";
    default:
      return "Не удалось отклонить приглашение";
  }
}
