# CROSS++

## Email auth setup

Backend now supports:

- email verification after registration
- password reset by email
- SMTP delivery with safe dev fallback

Required backend env vars:

- `APP_PUBLIC_URL` or `FRONTEND_PUBLIC_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

If your server blocks standard SMTP ports, use relay host `skvmrelay.netangels.ru`.
In local development, if SMTP env vars are not configured, backend logs verification/reset links to the console.
