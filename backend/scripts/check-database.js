import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const connection = process.env.DATABASE_URL;
if (!connection) {
  console.error("DATABASE_URL is missing. Configure the PostgreSQL runtime connection before starting the API.");
  process.exit(1);
}

let databaseUrl;
try {
  databaseUrl = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) throw new Error("Invalid protocol");
} catch {
  console.error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("PostgreSQL connectivity verified.");
  await prisma.user.count();
  await prisma.application.count();
  await prisma.siteSetting.count();
  console.log("Core application tables are accessible. Run prisma migrate status to verify migration history.");
} catch (error) {
  const explanations = {
    P1000: "PostgreSQL rejected authentication. Check the database username and password.",
    P1001: "PostgreSQL is unreachable. Check the host, port, database availability, and network access.",
    P1002: "PostgreSQL connection timed out. Check database availability and connection pooling.",
    P1011: "PostgreSQL TLS negotiation failed. Check the database provider's SSL requirements.",
    P2021: "A required database table is missing. Run the reviewed Prisma deployment migrations.",
    P2022: "A required database column is missing. Run the reviewed Prisma deployment migrations."
  };
  console.error(explanations[error.code] || "Database validation failed. Inspect the protected deployment logs for details.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
