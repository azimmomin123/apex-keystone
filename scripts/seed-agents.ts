/**
 * Seed agents into Keystone via GraphQL API.
 * Run after creating the first admin user:
 *   npx tsx scripts/seed-agents.ts
 *
 * Requires: KEYSTONE_URL (defaults to http://localhost:3000)
 *           ADMIN_EMAIL + ADMIN_PASSWORD for auth
 */

const KEYSTONE_URL = process.env.KEYSTONE_URL || "http://localhost:3000";

const agents = [
  { name: "Farid Chatur", email: "farid@apexrealtors.com", phone: "832-282-0224", specialty: "Commercial, Residential", area: "Houston", telegramId: "8312041701" },
  { name: "Mirza Ali", email: "Mirza@apexrealtors.com", phone: "832-359-8899", specialty: "Commercial, Residential", area: "Houston", telegramId: "" },
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

async function authenticate(): Promise<string> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars");
  }

  const res = await fetch(`${KEYSTONE_URL}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation { authenticateUserWithPassword(email: "${email}", password: "${password}") { ... on UserAuthenticationWithPasswordSuccess { sessionToken } ... on UserAuthenticationWithPasswordFailure { message } } }`,
    }),
  });
  const data = await res.json();
  const result = data.data?.authenticateUserWithPassword;
  if (result?.sessionToken) return result.sessionToken;
  throw new Error(`Auth failed: ${result?.message || JSON.stringify(data)}`);
}

async function seedAgents(sessionToken: string) {
  const defaultPassword = "ApexAgent2026!";

  for (const agent of agents) {
    console.log(`Creating ${agent.name}...`);
    const res = await fetch(`${KEYSTONE_URL}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `keystonejs-session=${sessionToken}`,
      },
      body: JSON.stringify({
        query: `mutation CreateUser($data: UserCreateInput!) { createUser(data: $data) { id name email } }`,
        variables: {
          data: {
            name: agent.name,
            email: agent.email,
            password: defaultPassword,
            phone: agent.phone,
            specialty: agent.specialty,
            area: agent.area,
            telegramId: agent.telegramId,
            isActive: true,
          },
        },
      }),
    });
    const result = await res.json();
    if (result.errors) {
      console.log(`  Skipped (${result.errors[0]?.message})`);
    } else {
      console.log(`  Created: ${result.data.createUser.id}`);
    }
  }
}

async function main() {
  console.log(`Seeding agents to ${KEYSTONE_URL}...`);
  const token = await authenticate();
  console.log("Authenticated.");
  await seedAgents(token);
  console.log("Done.");
}

main().catch(console.error);
