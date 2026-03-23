## CROSS++
Cross++ - это будущая мультиплатформенная среда разработки с поддержкой синхронизации кода между устройствами и совместной разработки.

### Запуск проекта:
1. В корне проекта выполните
```bash
npm install
```
2. Подготовьте .env файлы и Prisma schema
```bash
cd backend
copy .env.example .env
npx prisma generate
cd ../frontend
copy .env.example .env
```
3. Запустите проект из корня
```bash
npm run start
```