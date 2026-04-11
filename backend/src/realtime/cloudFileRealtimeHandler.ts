import { ZodError } from "zod";
import type WebSocket from "ws";
import { isRealtimeSupportedCloudFileName } from "../lib/cloudFileSupport.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { getProjectAccess } from "../lib/projectAccess.js";
import { FileRoomRegistry, type AuthenticatedWebSocket } from "./fileRoomRegistry.js";
import {
  parseClientEnvelope,
  serverEventTypes,
  type ContentUpdatePayload,
  type JoinFilePayload,
  type LeaveFilePayload,
  type ServerEnvelope,
} from "./protocol.js";

type RealtimeFile = {
  id: string;
  projectId: string;
  name: string;
  version: number;
  accessRole: "owner" | "editor" | "viewer";
};

function serialize(message: ServerEnvelope) {
  return JSON.stringify(message);
}

function send(socket: WebSocket, message: ServerEnvelope) {
  if (socket.readyState === socket.OPEN) {
    socket.send(serialize(message));
  }
}

function sendWsError(socket: WebSocket, code: string, message: string) {
  send(socket, {
    type: serverEventTypes.wsError,
    payload: {
      code,
      message,
    },
  });
}

function toWsError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code:
        error.code ??
        (error.statusCode === 401
          ? "UNAUTHORIZED"
          : error.statusCode === 403
            ? "FORBIDDEN"
            : error.statusCode === 404
              ? "NOT_FOUND"
              : error.statusCode === 409
                ? "CONFLICT"
                : "BAD_REQUEST"),
      message: error.message,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: "BAD_PAYLOAD",
      message: error.issues[0]?.message ?? "Некорректный формат websocket-сообщения",
    };
  }

  if (error instanceof SyntaxError) {
    return {
      code: "BAD_PAYLOAD",
      message: "Не удалось разобрать websocket-сообщение",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Внутренняя ошибка websocket-сервера",
  };
}

async function getRealtimeFileOrThrow(userId: string, fileId: string): Promise<RealtimeFile> {
  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      version: true,
    },
  });

  if (!file) {
    throw new AppError("Файл не найден", 404, undefined, "FILE_NOT_FOUND");
  }

  const access = await getProjectAccess(userId, file.projectId);

  if (!access) {
    throw new AppError("Файл не найден", 404, undefined, "FILE_NOT_FOUND");
  }

  return {
    ...file,
    accessRole: access.role,
  };
}

function assertRealtimeSupported(fileName: string) {
  if (!isRealtimeSupportedCloudFileName(fileName)) {
    throw new AppError("Этот тип облачного файла не поддерживает realtime-синхронизацию", 400);
  }
}

export function createCloudFileRealtimeHandler(registry: FileRoomRegistry) {
  async function handleJoinFile(socket: AuthenticatedWebSocket, payload: JoinFilePayload) {
    const file = await getRealtimeFileOrThrow(socket.userId, payload.fileId);
    assertRealtimeSupported(file.name);

    registry.join(socket, file.id);

    send(socket, {
      type: serverEventTypes.joinedFileAck,
      payload: {
        fileId: file.id,
        version: file.version,
      },
    });
  }

  function handleLeaveFile(socket: AuthenticatedWebSocket, payload: LeaveFilePayload) {
    registry.leave(socket, payload.fileId);
  }

  async function handleContentUpdate(
    socket: AuthenticatedWebSocket,
    payload: ContentUpdatePayload,
  ) {
    const activeFileId = registry.getActiveFileId(socket);

    if (activeFileId !== payload.fileId) {
      throw new AppError("Сначала подключитесь к файлу", 409, undefined, "CONFLICT");
    }

    const file = await getRealtimeFileOrThrow(socket.userId, payload.fileId);
    assertRealtimeSupported(file.name);

    if (file.accessRole === "viewer") {
      throw new AppError("У вас только доступ для чтения этого файла", 403, undefined, "FORBIDDEN");
    }

    const expectedVersion = payload.baseVersion ?? file.version;

    if (payload.baseVersion !== undefined && payload.baseVersion !== file.version) {
      throw new AppError(
        "Версия облачного файла устарела. Обновите файл и повторите попытку.",
        409,
        undefined,
        "CONFLICT",
      );
    }

    const updatedFile = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.file.updateMany({
        where: {
          id: file.id,
          version: expectedVersion,
        },
        data: {
          content: payload.content,
          version: {
            increment: 1,
          },
        },
      });

        if (updateResult.count !== 1) {
          throw new AppError(
            "Версия облачного файла устарела. Обновите файл и повторите попытку.",
            409,
            undefined,
            "CONFLICT",
          );
        }

      return tx.file.findUniqueOrThrow({
        where: {
          id: file.id,
        },
        select: {
          id: true,
          content: true,
          version: true,
          updatedAt: true,
        },
      });
    });

    const updatedAt = updatedFile.updatedAt.toISOString();

    send(socket, {
      type: serverEventTypes.contentUpdateAck,
      payload: {
        fileId: updatedFile.id,
        version: updatedFile.version,
        updatedAt,
      },
    });

    registry.broadcast(
      updatedFile.id,
      serialize({
        type: serverEventTypes.remoteUpdate,
        payload: {
          fileId: updatedFile.id,
          content: updatedFile.content,
          version: updatedFile.version,
          updatedAt,
        },
      }),
      {
        excludeSocket: socket,
      },
    );
  }

  async function handleMessage(socket: AuthenticatedWebSocket, rawMessage: WebSocket.RawData) {
    const envelope = parseClientEnvelope(rawMessage.toString());

    switch (envelope.type) {
      case "join_file":
        await handleJoinFile(socket, envelope.payload);
        return;
      case "leave_file":
        handleLeaveFile(socket, envelope.payload);
        return;
      case "content_update":
        await handleContentUpdate(socket, envelope.payload);
        return;
    }
  }

  return {
    attach(socket: AuthenticatedWebSocket) {
      socket.on("message", (rawMessage) => {
        void handleMessage(socket, rawMessage).catch((error) => {
          const wsError = toWsError(error);

          if (wsError.code === "INTERNAL_ERROR") {
            console.error("Необработанная ошибка:", error);
          }

          sendWsError(socket, wsError.code, wsError.message);
        });
      });

      socket.on("close", () => {
        registry.disconnect(socket);
      });
    },
  };
}
