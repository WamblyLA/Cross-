# Frontend / Desktop

Локальные команды:

```bash
npm run dev
npm run start
npm run dev:renderer
npm run dev:electron
npm run build
```

Режимы запуска:

- `npm run dev` - запускает Vite + Electron и направляет HTTP/WS-запросы на локальный backend `http://localhost:3000`
- `npm run start` - запускает Vite + Electron и направляет HTTP/WS-запросы на облачный backend `https://api.crosspp.ru`
- `npm run build` - отдельная команда сборки, она не используется командами `dev` и `start`
