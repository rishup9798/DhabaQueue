import { PrismaClient } from "@prisma/client";

// A single shared Prisma client instance, reused across the app so we don't
// exhaust the Postgres connection pool with a new client per request.
export const prisma = new PrismaClient();
