# Cross++

Cross++ — кроссплатформенная среда разработки на Electron и React для Python и C++. Поддерживает редактор Monaco, терминал, запуск программ, Jupyter-ноутбуки, облачные проекты, синхронизацию и совместную работу. В репозитории также находится мобильный клиент на Expo

## Структура

- `frontend` — desktop-приложение Electron + React;
- `backend` — API, WebSocket, PostgreSQL и Prisma;
- `mobile` — мобильный клиент Expo/React Native

## Локальный запуск

Понадобятся [Bun](https://bun.sh/), Docker, Python 3 с Jupyter и C++-компилятор (`g++`, Clang или MSVC)

```powershell
# Backend и PostgreSQL
Copy-Item backend/.env.example backend/.env
cd backend
bun install --frozen-lockfile
docker compose up -d postgres
bun run prisma:generate
bun run prisma:migrate
bun run dev

# Desktop — в отдельном терминале
cd frontend
bun install --frozen-lockfile
bun run dev
```

Мобильный клиент запускается отдельно:

```powershell
cd mobile
bun install --frozen-lockfile
bun run start
```

## Развёртывание backend

1. Направьте DNS домена на сервер и укажите домен в `backend/Caddyfile`
2. Создайте `backend/.env` из примера и замените пароли и `JWT_SECRET`
3. Запустите сервисы:

```bash
cd backend
docker compose up -d --build
curl https://your-domain.example/health
```

Caddy автоматически получает TLS-сертификат. Telegram-настройки для bug reports необязательны

## Проверка

```powershell
cd backend; bun run lint; bun run typecheck; bun run test:run; bun run build
cd ../frontend; bun run lint; bun run test:electron; bun run build
cd ../mobile; bun run typecheck
```

Лицензия: [MIT](LICENSE)
