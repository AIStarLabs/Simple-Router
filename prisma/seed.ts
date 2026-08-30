// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PROVIDER_PRESETS } from "../lib/providers/presets";
import { encryptSecret } from "../lib/crypto";
import { serializeTags } from "../lib/providers/types";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function main() {
  // 1. Admin user
  const existingUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        name: "Admin",
        role: "admin",
      },
    });
    console.log(`✔ Created admin user ${ADMIN_EMAIL}`);
  } else {
    console.log(`= Admin user ${ADMIN_EMAIL} already exists`);
  }

  // 2. Providers from presets
  for (const preset of PROVIDER_PRESETS) {
    const existing = await prisma.provider.findUnique({ where: { name: preset.name } });
    if (existing) {
      console.log(`= Provider ${preset.name} already exists`);
      continue;
    }
    const provider = await prisma.provider.create({
      data: {
        name: preset.name,
        type: preset.type,
        baseUrl: preset.baseUrl,
        authType: preset.authType,
        enabled: true,
      },
    });
    await prisma.providerModel.createMany({
      data: preset.models.map((m) => ({
        providerId: provider.id,
        modelId: m.modelId,
        displayName: m.displayName,
        maxContext: m.maxContext ?? null,
        supportsVision: m.supportsVision ?? false,
        supportsImage: m.supportsImage ?? false,
        supportsReasoning: m.supportsReasoning ?? false,
        supportsVietnamese: m.supportsVietnamese ?? false,
        bestTaskTags: serializeTags(m.bestTaskTags),
      })),
    });
    console.log(`✔ Seeded provider ${preset.name} (${preset.models.length} models)`);
  }

  // 3. Example inbound key (a virtual API with its own routing)
  const keyCount = await prisma.inboundAPIKey.count();
  if (keyCount === 0) {
    const plain = `sk-sr-${randomBytes(24).toString("hex")}`;
    const key = await prisma.inboundAPIKey.create({
      data: {
        name: "Development",
        description:
          "Local development key. Call with model \"Development\" to use its routing, or use any provider model id directly.",
        key: hashApiKey(plain),
        keyEncrypted: encryptSecret(plain),
        enabled: true,
        routingStrategy: "roundRobin",
      },
    });

    // Grant a few models so the key's virtual model has something to route to.
    const targets = [
      await prisma.providerModel.findFirst({ where: { modelId: { contains: "flash" } } }),
      await prisma.providerModel.findFirst({ where: { modelId: { contains: "llama" } } }),
      await prisma.providerModel.findFirst({ where: { modelId: { contains: "mini" } } }),
    ];
    let idx = 0;
    for (const m of targets) {
      if (!m) continue;
      await prisma.inboundModelPermission.create({
        data: {
          apiKeyId: key.id,
          providerModelId: m.id,
          enabled: true,
          priority: idx++,
          weight: 1,
        },
      });
    }
    console.log(`✔ Created example inbound key: ${plain}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
