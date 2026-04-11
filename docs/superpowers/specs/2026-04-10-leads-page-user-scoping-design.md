# Leads page: per-user scoping + personal leads

**Date:** 2026-04-10
**Repo:** `next-keystone-starter` (a.k.a. `apex-keystone`)
**Branch target:** `master`

## Problem

Today the Leads page at `/dashboard/admin/leads` is admin-only (hard redirect in `app/dashboard/(admin)/admin/layout.tsx:28-30`) and shows every lead in the database. Non-admin users have no way to see the leads assigned to them, and no way to track leads they find on their own without dumping them into the shared pool.

## Goal

Let every signed-in user open the Leads page. What they see depends on their role:

- **Admin** — sees every *Apex* lead (the shared, company-owned pool).
- **Non-admin user** — sees every lead assigned to them, whether it came from the shared pool (Apex) or they added it themselves (Personal).

Personal leads are private. Even admins cannot see someone else's Personal lead.

## Data model

Add one field to the `Lead` list in `features/keystone/models/Lead.ts`:

```ts
type: select({
  type: 'string',
  defaultValue: 'apex',
  options: [
    { label: 'Apex', value: 'apex' },
    { label: 'Personal', value: 'personal' },
  ],
  validation: { isRequired: true },
  ui: { displayMode: 'segmented-control' },
}),
```

A Prisma migration adds the column with default `'apex'`, so every existing row is backfilled as Apex. No data is lost.

## Access rules

Replace the current `access.operation` block on `Lead` with one that also carries a `filter.query` rule:

```ts
access: {
  operation: { ...allOperations(isSignedIn) },
  filter: {
    query: ({ session }) => {
      if (!session) return false;
      const mine = { assignedTo: { user: { id: { equals: session.itemId } } } };
      if (session.data?.isAdmin === true) {
        return { type: { equals: 'apex' } };
      }
      return mine;
    },
    update: ({ session }) => {
      if (!session) return false;
      if (session.data?.isAdmin === true) return { type: { equals: 'apex' } };
      return { assignedTo: { user: { id: { equals: session.itemId } } } };
    },
    delete: ({ session }) => {
      if (!session) return false;
      if (session.data?.isAdmin === true) return { type: { equals: 'apex' } };
      return { assignedTo: { user: { id: { equals: session.itemId } } } };
    },
  },
},
```

Enforcement lives at the GraphQL layer. The Next page, the MCP agent, and any direct GraphQL caller inherit the same rules — this is the security boundary, not just UI polish.

**Admin-can't-see-personal-lead corollary:** Because the admin filter is `type = 'apex'`, a personal lead is literally invisible to admins at the read layer. They cannot query it, list it, update it, or delete it. No extra work needed.

## Write-path enforcement (create)

Non-admins must not be able to hand a lead to someone else (they'd then lose visibility) and must not be able to mark a lead as Apex by smuggling it through the API. Add a `hooks.resolveInput` on `Lead` (also in `features/keystone/models/Lead.ts`):

```ts
hooks: {
  resolveInput: async ({ operation, resolvedData, inputData, context }) => {
    if (operation !== 'create') return resolvedData;
    const session = context.session;
    if (!session || session.data?.isAdmin === true) return resolvedData;

    // Non-admin create: force assignedTo to the caller's own agent.
    // findMany + take: 1 is used because Agent.user is a relation, and
    // findOne's where-input only accepts unique scalars.
    const agents = await context.sudo().query.Agent.findMany({
      where: { user: { id: { equals: session.itemId } } },
      take: 1,
      query: 'id',
    });
    const agent = agents[0];
    if (!agent) {
      throw new Error('You must be linked to an Agent profile to create a lead.');
    }

    // Read the raw client input (not resolvedData) so we can distinguish
    // "client explicitly sent type=apex" from "client omitted type and
    // the field default applied". For non-admins, the safer default is
    // 'personal' — only honor 'apex' if the client asked for it.
    const clientType = (inputData as { type?: string } | undefined)?.type;
    const type = clientType === 'apex' ? 'apex' : 'personal';

    return {
      ...resolvedData,
      type,
      assignedTo: { connect: { id: agent.id } },
    };
  },
},
```

Note: the user *is* allowed to promote their own lead to Apex via the picker. What they are *not* allowed to do is assign it to someone else. The `inputData` check matters: a non-admin API caller that omits `type` entirely (e.g. curl, or an older client) gets their lead forced to Personal, not Apex — this is the safer default.

## Routing

- Move the folder: `app/dashboard/(admin)/admin/leads/` → `app/dashboard/leads/`.
- Update any imports inside those files that referenced `../../../...` relative to the old depth.
- Add a redirect stub at the old path: a new `app/dashboard/(admin)/admin/leads/page.tsx` that just calls `redirect('/dashboard/leads')`. One file, 3 lines.
- The `(admin)` layout gate no longer affects the leads page.

## Sidebar

`features/dashboard/components/Sidebar.tsx:222-241`: today the `Leads` link lives inside `{user?.isAdmin === true && ( ... )}`. Move it out into the main nav group above the Admin section. Update the `href` to `/dashboard/leads`. Admin section keeps Dashboard, Users, Roles as before.

## Leads view UI

In `app/dashboard/leads/_components/leads-view.tsx`:

- The view receives an `isAdmin` prop from the server component.
- **All agents** filter dropdown (lines 103–116): render only if `isAdmin === true`. Non-admins don't see it.
- **Sync Gmail now** button: render only if `isAdmin === true`.
- Page subtitle: `isAdmin ? "Kanban and table views of all inbound leads." : "Kanban and table views of leads assigned to you."`
- No change to the Kanban columns or the Table view — they just receive the filtered `leads` prop as before.

## New Lead dialog

- For admins, nothing changes: no type picker, `assignedTo` is a dropdown of all agents, default behaviour matches today.
- For non-admins, the dialog shows a `Lead type` segmented control (Personal / Apex), the `assignedTo` field is hidden and pre-filled on the server to the caller's own Agent. Client-side value is ignored — server hook is the source of truth (see Write-path enforcement).

The dialog component is whichever file currently handles "New Lead" creation in `leads-view.tsx`; locate it and add a conditional on the `isAdmin` prop.

## Server component (`page.tsx`)

`fetchLeadsAndAgents()` does not need to change the `leads` query — the access filter handles scoping. It does need two small additions:

1. Fetch `authenticatedItem { ... on User { id isAdmin } }` alongside the leads query.
2. Pass `isAdmin` into `<LeadsView>` as a prop.

The `agents` query stays as-is (used by the admin's "All agents" filter and the admin's new-lead dropdown).

## Tests

1. **Access filter unit test** (`features/keystone/models/Lead.test.ts`): call `filter.query` with three shapes of session — admin, non-admin, no session — assert the returned where clauses.
2. **Keystone integration test** using `@keystone-6/core/testing`: seed 1 admin, 1 agent-linked non-admin, 3 leads (1 Apex assigned to the non-admin, 1 Apex assigned to someone else, 1 Personal created by the non-admin). Assert:
   - Admin `leads` query returns the 2 Apex leads (no Personal).
   - Non-admin `leads` query returns their 1 Apex + their 1 Personal (no other Apex).
3. **Create-hook test**: non-admin mutation `createLead(data: { name: "x", type: "apex", assignedTo: { connect: { id: "someoneElse" } } })` — assert the saved row has `assignedTo` set to the caller's own agent, not the smuggled id.
4. **Page render test**: non-admin session hitting `/dashboard/leads` returns 200 (no redirect). Admin hitting the same URL also returns 200.
5. **Sidebar test**: non-admin session → sidebar shows `Leads` link outside the Admin group. Admin still sees everything.

## Out of scope

- Role-flag-based gating (`role.canManageLeads`, `role.canManageAllLeads`). Deferred; current change uses `isAdmin` for simplicity. Can be migrated to roles later without schema changes.
- Scoping of `Activity`, `Property`, and similar relation lists. A non-admin reading a lead can read its nested `activities` because the lead is theirs; but querying `activities` at the top level still returns everything. Fixing that is a separate pass.
- Keystone's built-in Admin UI (`/api/keystone/`). It inherits list-level access automatically, so no extra work, but no custom UI polish either.
- Transferring an existing Personal lead to Apex, or reassigning an Apex lead from one user to another. Current admin flow already handles Apex reassignment; Personal-to-Apex promotion is something a non-admin can do by editing the `type` on their own lead, but it will immediately vanish from their own view if it's still assigned to them as Apex *and* they are not the admin. (Acceptable; they can re-find it as admin.)

## Files touched

- `features/keystone/models/Lead.ts` — add `type` field, add access filter, add `resolveInput` hook.
- `migrations/*` — new Prisma migration adding the column with default `'apex'`.
- `app/dashboard/(admin)/admin/leads/` — move to `app/dashboard/leads/`, leave a redirect stub behind.
- `app/dashboard/leads/page.tsx` — also fetch current user's `isAdmin`, pass to view.
- `app/dashboard/leads/_components/leads-view.tsx` — conditional chrome based on `isAdmin`.
- `app/dashboard/leads/_components/*-dialog.tsx` (new-lead dialog file) — conditional type picker + hidden assignedTo for non-admins.
- `features/dashboard/components/Sidebar.tsx` — move Leads link out of Admin group.
- `features/keystone/models/Lead.test.ts` — new test file for access filter + create hook.
