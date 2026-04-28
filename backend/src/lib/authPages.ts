function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderShell(title: string, body: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: #f5f7fb;
        color: #132238;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      main {
        width: min(100%, 420px);
        background: #ffffff;
        border: 1px solid #d6e0ef;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 12px 30px rgba(16, 38, 66, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }
      p {
        margin: 0 0 12px;
        line-height: 1.55;
      }
      form {
        display: grid;
        gap: 14px;
        margin-top: 16px;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #c7d3e5;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 16px;
      }
      button {
        border: 0;
        border-radius: 10px;
        background: #0f62fe;
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
        padding: 12px 14px;
        cursor: pointer;
      }
      .notice {
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 14px;
        margin-bottom: 14px;
      }
      .notice-error {
        background: #fff2f2;
        border: 1px solid #f3b4b4;
        color: #a02727;
      }
      .notice-success {
        background: #eef8f0;
        border: 1px solid #b6d8bf;
        color: #23663a;
      }
      .field-error {
        color: #a02727;
        font-size: 13px;
        font-weight: 400;
      }
      .hint {
        color: #5b6b83;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;
}

function renderNotice(message: string, tone: "error" | "success") {
  return `<div class="notice notice-${tone}">${escapeHtml(message)}</div>`;
}

export function renderMessagePage(options: {
  title: string;
  message: string;
  tone?: "error" | "success";
}) {
  const tone = options.tone ?? "success";
  return renderShell(
    options.title,
    `<h1>${escapeHtml(options.title)}</h1>${renderNotice(options.message, tone)}`,
  );
}

export function renderResetPasswordFormPage(options: {
  token: string;
  message?: string | null;
  tone?: "error" | "success";
  fieldErrors?: {
    password?: string;
    passwordConfirm?: string;
  };
}) {
  const fieldErrors = options.fieldErrors ?? {};
  const notice =
    options.message && options.tone
      ? renderNotice(options.message, options.tone)
      : options.message
        ? `<p>${escapeHtml(options.message)}</p>`
        : "";

  return renderShell(
    "Новый пароль CROSS++",
    `
      <h1>Новый пароль</h1>
      <p class="hint">Введите новый пароль для аккаунта CROSS++.</p>
      ${notice}
      <form method="post" action="/api/auth/reset-password">
        <input type="hidden" name="token" value="${escapeHtml(options.token)}" />
        <label>
          Новый пароль
          <input type="password" name="password" autocomplete="new-password" required />
          ${
            fieldErrors.password
              ? `<span class="field-error">${escapeHtml(fieldErrors.password)}</span>`
              : ""
          }
        </label>
        <label>
          Подтвердите пароль
          <input
            type="password"
            name="confirmPassword"
            autocomplete="new-password"
            required
          />
          ${
            fieldErrors.passwordConfirm
              ? `<span class="field-error">${escapeHtml(fieldErrors.passwordConfirm)}</span>`
              : ""
          }
        </label>
        <button type="submit">Сохранить новый пароль</button>
      </form>
    `,
  );
}
