import type { ApiError } from "../../lib/api/errorNormalization";

function isForbidden(error: ApiError | null | undefined) {
  return error?.code === "FORBIDDEN" || error?.status === 403;
}

export function getCreateInvitationErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось отправить приглашение";
  }

  switch (error.code) {
    case "USER_NOT_FOUND":
      return "Пользователь не найден";
    case "ALREADY_MEMBER":
      return "Пользователь уже добавлен";
    case "ALREADY_INVITED":
      return "Пользователь уже приглашён";
    default:
      return isForbidden(error)
        ? "У вас нет прав на управление участниками"
        : "Не удалось отправить приглашение";
  }
}

export function getRevokeInvitationErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось отозвать приглашение";
  }

  switch (error.code) {
    case "INVITATION_NOT_FOUND":
      return "Приглашение не найдено";
    case "INVITATION_NOT_PENDING":
      return "Приглашение больше не ожидает ответа";
    default:
      return isForbidden(error)
        ? "У вас нет прав на управление участниками"
        : "Не удалось отозвать приглашение";
  }
}

export function getUpdateMemberRoleErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось обновить права доступа";
  }

  switch (error.code) {
    case "MEMBER_NOT_FOUND":
      return "Участник проекта не найден";
    case "OWNER_CANNOT_BE_REMOVED":
      return "Нельзя изменить роль владельца проекта";
    default:
      return isForbidden(error)
        ? "У вас нет прав на управление участниками"
        : "Не удалось обновить права доступа";
  }
}

export function getRemoveMemberErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось удалить пользователя";
  }

  switch (error.code) {
    case "MEMBER_NOT_FOUND":
      return "Участник проекта не найден";
    case "OWNER_CANNOT_BE_REMOVED":
      return "Нельзя удалить владельца проекта";
    default:
      return isForbidden(error)
        ? "У вас нет прав на управление участниками"
        : "Не удалось удалить пользователя";
  }
}

export function getMembersLoadErrorMessage(error: ApiError | null | undefined) {
  if (!error) {
    return "Не удалось загрузить список участников";
  }

  return isForbidden(error)
    ? "У вас нет прав на просмотр участников проекта"
    : "Не удалось загрузить список участников";
}

export function getReadOnlyCloudMessage() {
  return "У вас только доступ для чтения";
}
