import { z } from "zod";

const uuidSchema = z.string().uuid("Некорректный идентификатор файла");

const joinFilePayloadSchema = z.object({
  fileId: uuidSchema,
});

const leaveFilePayloadSchema = z.object({
  fileId: uuidSchema,
});

const contentUpdatePayloadSchema = z.object({
  fileId: uuidSchema,
  content: z.string(),
  baseVersion: z.number().int().min(0).optional(),
});

const clientEnvelopeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join_file"),
    payload: joinFilePayloadSchema,
  }),
  z.object({
    type: z.literal("leave_file"),
    payload: leaveFilePayloadSchema,
  }),
  z.object({
    type: z.literal("content_update"),
    payload: contentUpdatePayloadSchema,
  }),
]);

export const serverEventTypes = {
  joinedFileAck: "joined_file_ack",
  remoteUpdate: "remote_update",
  contentUpdateAck: "content_update_ack",
  wsError: "ws_error",
} as const;

export type JoinFilePayload = z.infer<typeof joinFilePayloadSchema>;
export type LeaveFilePayload = z.infer<typeof leaveFilePayloadSchema>;
export type ContentUpdatePayload = z.infer<typeof contentUpdatePayloadSchema>;
export type ClientEnvelope = z.infer<typeof clientEnvelopeSchema>;

export type ServerEnvelope =
  | {
      type: typeof serverEventTypes.joinedFileAck;
      payload: {
        fileId: string;
        version: number;
      };
    }
  | {
      type: typeof serverEventTypes.remoteUpdate;
      payload: {
        fileId: string;
        content: string;
        version: number;
        updatedAt: string;
      };
    }
  | {
      type: typeof serverEventTypes.contentUpdateAck;
      payload: {
        fileId: string;
        version: number;
        updatedAt: string;
      };
    }
  | {
      type: typeof serverEventTypes.wsError;
      payload: {
        code: string;
        message: string;
      };
    };

export function parseClientEnvelope(raw: string): ClientEnvelope {
  return clientEnvelopeSchema.parse(JSON.parse(raw));
}
