/**
 * Auto-seed script — runs on container startup before Next.js.
 * Inserts agents if the User table is empty (fresh deploy).
 * Uses raw SQL via Prisma — no auth needed.
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// bcrypt-style hash not available without the lib, so we'll use Keystone's
// password field which expects a bcrypt hash. We'll generate one with scrypt
// and set a flag so users must reset. Actually, Keystone uses bcrypt from
// @keystone-6/core internals. Let's just insert with a known bcrypt hash.
// This is the bcrypt hash for "ApexAgent2026!"
// We'll generate it inline.

async function hashPassword(password) {
  // Simple approach: use node's built-in scrypt won't work with Keystone's bcrypt.
  // Instead, we'll use prisma's raw query after Keystone creates the admin.
  // Better approach: skip password for seeded agents, admin creates them.
  // Simplest: use a pre-computed bcrypt hash.

  // Actually, let's use the approach of just inserting via Prisma raw SQL
  // with Keystone's password hashing format. Keystone uses bcrypt from the
  // 'bcryptjs' package which is in node_modules.
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
  // Check if users already exist (beyond the init admin)
  const count = await prisma.user.count();
  if (count > 1) {
    console.log(`[seed] ${count} users already exist, skipping agent seed.`);
    return;
  }

  console.log("[seed] Seeding agents...");
  const passwordHash = await hashPassword("ApexAgent2026!");

  // Create admin role if it doesn't exist
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

  // Create agent role
  let agentRole = await prisma.role.findFirst({ where: { name: "Agent" } });
  if (!agentRole) {
    agentRole = await prisma.role.create({
      data: {
        id: crypto.randomUUID(),
        name: "Agent",
        canManageLeads: true,
        canManageAllLeads: false,
        canSeeOtherPeople: true,
        canEditOtherPeople: false,
        canManagePeople: false,
        canManageRoles: false,
        canAccessDashboard: true,
      },
    });
    console.log("[seed] Created Agent role.");
  }

  // Create admin user if none exists
  const adminExists = await prisma.user.count();
  if (adminExists === 0) {
    const adminHash = await hashPassword("ApexAdmin2026!");
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: "Apex Admin",
        email: "admin@apexrealtors.com",
        password: adminHash,
        phone: "",
        specialty: "",
        area: "",
        telegramId: "",
        isActive: true,
        role: { connect: { id: adminRole.id } },
      },
    });
    console.log("[seed] Created admin user: admin@apexrealtors.com / ApexAdmin2026!");
  }

  // Seed agents
  for (const agent of agents) {
    const exists = await prisma.user.findUnique({ where: { email: agent.email } });
    if (exists) {
      console.log(`[seed] ${agent.name} already exists, skipping.`);
      continue;
    }

    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: agent.name,
        email: agent.email,
        password: passwordHash,
        phone: agent.phone,
        specialty: agent.specialty,
        area: agent.area,
        telegramId: agent.telegramId,
        isActive: true,
        role: { connect: { id: agentRole.id } },
      },
    });
    console.log(`[seed] Created agent: ${agent.name}`);
  }

  console.log("[seed] Done.");
}

seed()
  .catch((e) => {
    console.error("[seed] Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
