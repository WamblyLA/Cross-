import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = path.resolve(import.meta.dirname, "../prisma/migrations");

describe("Prisma migration history", () => {
  it("creates the core tables in exactly one initial migration", async () => {
    const entries = await readdir(migrationsDirectory, { withFileTypes: true });
    const migrationSql = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) =>
          readFile(path.join(migrationsDirectory, entry.name, "migration.sql"), "utf8"),
        ),
    );

    const coreInitialMigrations = migrationSql.filter(
      (sql) =>
        sql.includes('CREATE TABLE "User"') &&
        sql.includes('CREATE TABLE "Project"') &&
        sql.includes('CREATE TABLE "File"'),
    );

    expect(coreInitialMigrations).toHaveLength(1);
  });
});
