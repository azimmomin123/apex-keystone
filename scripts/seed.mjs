/**
 * Auto-seed script — runs on container startup before Next.js.
 * Creates admin user, roles, and agents if the DB is fresh.
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hash(password, 10);
}

const agents = [
  { name: "Farid Chatur", email: "farid@apexrealtors.com", phone: "832-282-0224", specialty: "Commercial, Residential", area: "Houston", telegramId: "8312041701" },
  { name: "Mirza Ali", email: "mirza@apexrealtors.com", phone: "832-359-8899", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Shayan Khan", email: "mtrealtor.shayan@gmail.com", phone: "281-903-6512", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Dinesh (Dan) Ratwani", email: "dan@apexrealtors.com", phone: "407-764-2144", specialty: "Investments, Leasing", area: "Houston", telegramId: "" },
  { name: "Jason Schneider", email: "jason@apexrealtors.com", phone: "281-709-7650", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Daniel Myers", email: "dmyers@apexrealtors.com", phone: "510-415-0297", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Katherine Hoodye", email: "katherine@apexrealtors.com", phone: "832-955-6058", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Erika Amjadi", email: "erika@apexrealtors.com", phone: "832-865-0725", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Sunaina Ratwani", email: "su@apexrealtors.com", phone: "956-789-0686", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Sandy Aronds", email: "sandy@apexrealtors.com", phone: "713-254-8342", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Fatima Siddiqi", email: "fatima@apexrealtors.com", phone: "832-377-9084", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Daniel Bekele", email: "daniel@apexrealtors.com", phone: "713-377-4391", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Ruth Messele", email: "ruth@apexrealtors.com", phone: "", specialty: "Residential", area: "Houston", telegramId: "" },
  { name: "Matthew Likely", email: "mlikely@apexrealtors.com", phone: "713-458-8883", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Sunita Patel", email: "sunita@apexrealtors.com", phone: "", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
  { name: "Johana Motino", email: "johana@apexrealtors.com", phone: "", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Hira Khan", email: "hira@apexrealtors.com", phone: "", specialty: "Commercial", area: "Houston", telegramId: "" },
  { name: "Azim", email: "azimmomin123@gmail.com", phone: "", specialty: "", area: "", telegramId: "1662916079" },
  { name: "Nasir Ali", email: "nasir@apexrealtors.com", phone: "", specialty: "", area: "", telegramId: "1098194470" },
];

async function seed() {
  // Create admin role if missing
  let adminRole = await prisma.role.findFirst({ where: { name: "Admin" } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        id: crypto.randomUUID(),
        name: "Admin",
        canManageLeads: true,
        canManageAllLeads: true,
        canSeeOtherPeople: true,
        canEditOtherPeople: true,
        canManagePeople: true,
        canManageRoles: true,
        canAccessDashboard: true,
      },
    });
    console.log("[seed] Created Admin role.");
  }

  // Create admin user if none exists
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("[seed] SEED_ADMIN_PASSWORD env var required for initial setup");
      process.exit(1);
    }
    const adminHash = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: "Apex Admin",
        email: process.env.SEED_ADMIN_EMAIL || "admin@apexrealtors.com",
        password: adminHash,
        phone: "",
        specialty: "",
        area: "",
        telegramId: "",
        isActive: true,
        role: { connect: { id: adminRole.id } },
      },
    });
    console.log("[seed] Created admin user: " + (process.env.SEED_ADMIN_EMAIL || "admin@apexrealtors.com"));
  }

  // Seed Agent records
  const agentCount = await prisma.agent.count();
  if (agentCount > 0) {
    console.log(`[seed] ${agentCount} agents already exist, skipping.`);
    return;
  }

  console.log("[seed] Seeding agents...");
  for (const a of agents) {
    await prisma.agent.create({
      data: {
        id: crypto.randomUUID(),
        name: a.name,
        email: a.email,
        phone: a.phone,
        specialty: a.specialty,
        area: a.area,
        telegramId: a.telegramId,
        isActive: true,
      },
    });
    console.log(`[seed] Created agent: ${a.name}`);
  }

  console.log("[seed] Done — 19 agents created.");
}

seed()
  .catch((e) => {
    console.error("[seed] Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
