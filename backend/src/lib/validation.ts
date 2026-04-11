import { Buffer } from "node:buffer";
import { z } from "zod";

export const DEFAULT_SETTINGS = {
  theme: "dark",
  fontSize: 14,
  tabSize: 4,
} as const;

const idSchema = z.string().uuid("Некорректный UUID");
const trimmedString = () => z.string().trim();
const isoDateTimeSchema = z.string().datetime("Некорректная дата и время");
const usernameRegex = /^[\p{L}\p{N}]+(?:[ .'-][\p{L}\p{N}]+)*$/u;

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(3, "Имя должно быть не короче 3 символов")
      .max(32, "Имя должно быть не длиннее 32 символов")
      .regex(
        usernameRegex,
        "Используйте буквы, цифры, пробел, точку, апостроф или дефис",
      ),
  );

const emailSchema = trimmedString().toLowerCase().email("Некорректный email");
const projectMemberRoleSchema = z.enum(["editor", "viewer"], {
  message: "Поддерживаются только роли editor и viewer",
});

const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Пароль должен быть не длиннее 72 байт",
  );

const projectNameSchema = trimmedString()
  .min(1, "Название проекта обязательно")
  .max(120, "Название проекта должно быть не длиннее 120 символов");

const fileNameSchema = trimmedString()
  .min(1, "Имя файла обязательно")
  .max(255, "Имя файла должно быть не длиннее 255 символов")
  .refine(
    (value) => !/[\\/]/.test(value),
    "Имя файла не должно содержать символы / или \\",
  );

const themeSchema = z.enum(["dark", "light"], {
  message: "Поддерживаются только темы dark и light",
});

export const registerBodySchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Подтвердите пароль"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "Пароли не совпадают",
      });
    }
  });

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const updateProfileBodySchema = z
  .object({
    username: usernameSchema,
  })
  .strict();

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

export const loginBodySchema = z
  .object({
    login: trimmedString()
      .min(3, "Логин должен быть не короче 3 символов")
      .max(320, "Логин слишком длинный"),
    password: z.string().min(1, "Введите пароль"),
  })
  .strict()
  .transform((data) => ({
    login: data.login.toLowerCase(),
    password: data.password,
  }));

export type LoginBody = z.infer<typeof loginBodySchema>;

export const createProjectBodySchema = z.object({ name: projectNameSchema }).strict();
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const updateProjectBodySchema = z.object({ name: projectNameSchema }).strict();
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;

export const projectParamsSchema = z.object({ id: idSchema }).strict();
export type ProjectParams = z.infer<typeof projectParamsSchema>;

export const projectFilesParamsSchema = z.object({ projectId: idSchema }).strict();
export type ProjectFilesParams = z.infer<typeof projectFilesParamsSchema>;

export const projectMemberParamsSchema = z
  .object({
    projectId: idSchema,
    id: idSchema,
  })
  .strict();

export type ProjectMemberParams = z.infer<typeof projectMemberParamsSchema>;

export const createProjectMemberBodySchema = z
  .object({
    email: emailSchema,
    role: projectMemberRoleSchema,
  })
  .strict();

export type CreateProjectMemberBody = z.infer<typeof createProjectMemberBodySchema>;

export const createProjectInvitationBodySchema = createProjectMemberBodySchema;
export type CreateProjectInvitationBody = z.infer<typeof createProjectInvitationBodySchema>;

export const updateProjectMemberBodySchema = z
  .object({
    role: projectMemberRoleSchema,
  })
  .strict();

export type UpdateProjectMemberBody = z.infer<typeof updateProjectMemberBodySchema>;

export const projectInvitationParamsSchema = z
  .object({
    projectId: idSchema,
    id: idSchema,
  })
  .strict();

export type ProjectInvitationParams = z.infer<typeof projectInvitationParamsSchema>;

export const invitationActionParamsSchema = z.object({ id: idSchema }).strict();
export type InvitationActionParams = z.infer<typeof invitationActionParamsSchema>;

export const fileParamsSchema = z
  .object({
    projectId: idSchema,
    id: idSchema,
  })
  .strict();

export type ProjectFileParams = z.infer<typeof fileParamsSchema>;

export const folderParamsSchema = z
  .object({
    projectId: idSchema,
    id: idSchema,
  })
  .strict();

export type ProjectFolderParams = z.infer<typeof folderParamsSchema>;

export const createFileBodySchema = z
  .object({
    name: fileNameSchema,
    content: z.string().default(""),
    folderId: idSchema.nullable().optional(),
  })
  .strict();

export type CreateFileBody = z.infer<typeof createFileBodySchema>;

export const updateFileBodySchema = z
  .object({
    name: fileNameSchema.optional(),
    content: z.string().optional(),
    expectedVersion: z.coerce.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.name === undefined &&
      data.content === undefined &&
      data.expectedVersion === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["request"],
        message: "Нужно передать хотя бы name, content или expectedVersion",
      });
    }
  });

export type UpdateFileBody = z.infer<typeof updateFileBodySchema>;

export const moveFileBodySchema = z
  .object({
    targetProjectId: idSchema,
    targetFolderId: idSchema.nullable(),
  })
  .strict();

export type MoveFileBody = z.infer<typeof moveFileBodySchema>;

export const createFolderBodySchema = z
  .object({
    name: fileNameSchema,
    parentId: idSchema.nullable().optional(),
  })
  .strict();

export type CreateFolderBody = z.infer<typeof createFolderBodySchema>;

export const updateFolderBodySchema = z.object({ name: fileNameSchema }).strict();
export type UpdateFolderBody = z.infer<typeof updateFolderBodySchema>;

export const moveFolderBodySchema = z
  .object({
    targetProjectId: idSchema,
    targetParentId: idSchema.nullable(),
  })
  .strict();

export type MoveFolderBody = z.infer<typeof moveFolderBodySchema>;

export const projectLinkBodySchema = z
  .object({
    projectId: idSchema,
    clientBindingKey: trimmedString()
      .min(1, "Ключ связи обязателен")
      .max(120, "Ключ связи слишком длинный"),
    localRootLabel: trimmedString()
      .min(1, "Подпись локальной папки обязательна")
      .max(240, "Подпись локальной папки слишком длинная"),
  })
  .strict();

export type CreateProjectLinkBody = z.infer<typeof projectLinkBodySchema>;

export const projectLinkParamsSchema = z.object({ id: idSchema }).strict();
export type ProjectLinkParams = z.infer<typeof projectLinkParamsSchema>;

export const updateProjectLinkSyncSummaryBodySchema = z
  .object({
    lastSyncAt: isoDateTimeSchema.optional(),
    lastSyncDirection: z.enum(["push", "pull"]).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.lastSyncAt === undefined && data.lastSyncDirection === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["request"],
        message: "Нужно передать lastSyncAt или lastSyncDirection",
      });
    }
  });

export type UpdateProjectLinkSyncSummaryBody = z.infer<
  typeof updateProjectLinkSyncSummaryBodySchema
>;

export const updateSettingsBodySchema = z
  .object({
    theme: themeSchema.optional(),
    fontSize: z.coerce
      .number()
      .int("Размер шрифта должен быть целым числом")
      .min(9, "Размер шрифта должен быть не меньше 9")
      .max(32, "Размер шрифта должен быть не больше 32")
      .optional(),
    tabSize: z.coerce
      .number()
      .int("Размер табуляции должен быть целым числом")
      .min(2, "Размер табуляции должен быть не меньше 2")
      .max(8, "Размер табуляции должен быть не больше 8")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.theme === undefined &&
      data.fontSize === undefined &&
      data.tabSize === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["request"],
        message: "Нужно передать хотя бы одно поле настроек",
      });
    }
  });

export type UpdateSettingsBody = z.infer<typeof updateSettingsBodySchema>;
