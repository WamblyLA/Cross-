import nodemailer from "nodemailer";
import { APP_PUBLIC_URL, IS_PROD, SMTP_CONFIG } from "../config.js";

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  debugLabel: string;
};

let transporterPromise: Promise<ReturnType<typeof nodemailer.createTransport>> | null = null;

function getTransporter() {
  if (!SMTP_CONFIG) {
    return null;
  }

  const transportOptions: any = {
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.port === 465,
  };

  if (SMTP_CONFIG.user && SMTP_CONFIG.password) {
    transportOptions.auth = {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.password,
    };
  }

  transporterPromise ??= Promise.resolve(
    nodemailer.createTransport(transportOptions),
  );

  return transporterPromise;
}

export function buildAppUrl(pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, `${APP_PUBLIC_URL}/`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export async function sendEmail(options: MailOptions) {
  const transporter = getTransporter();

  if (!transporter) {
    if (IS_PROD) {
      throw new Error("SMTP не настроен");
    }

    console.log(`[email:dev] ${options.debugLabel}`);
    console.log(`[email:dev] to=${options.to}`);
    console.log(`[email:dev] subject=${options.subject}`);
    console.log(options.text);
    return;
  }

  const resolvedTransporter = await transporter;

  await resolvedTransporter.sendMail({
    from: SMTP_CONFIG!.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}

export async function sendEmailVerificationEmail(options: {
  to: string;
  verificationUrl: string;
  expiresAt: Date;
}) {
  const expiresLabel = options.expiresAt.toLocaleString("ru-RU");

  await sendEmail({
    to: options.to,
    subject: "Подтвердите email для CROSS++",
    debugLabel: `verification-link ${options.verificationUrl}`,
    text: [
      "Здравствуйте!",
      "",
      "Подтвердите email для входа в CROSS++:",
      options.verificationUrl,
      "",
      `Ссылка действует до ${expiresLabel}.`,
      "Если вы не создавали аккаунт, просто проигнорируйте это письмо.",
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  const expiresLabel = options.expiresAt.toLocaleString("ru-RU");

  await sendEmail({
    to: options.to,
    subject: "Сброс пароля CROSS++",
    debugLabel: `password-reset-link ${options.resetUrl}`,
    text: [
      "Здравствуйте!",
      "",
      "Чтобы задать новый пароль для CROSS++, перейдите по ссылке:",
      options.resetUrl,
      "",
      `Ссылка действует до ${expiresLabel}.`,
      "Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.",
    ].join("\n"),
  });
}
