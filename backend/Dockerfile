FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN bun install --frozen-lockfile

COPY src ./src

RUN bun run prisma:generate
RUN bun run build

FROM oven/bun:1 AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN bun install --frozen-lockfile --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

EXPOSE 3000

CMD ["bun", "run", "start:docker"]