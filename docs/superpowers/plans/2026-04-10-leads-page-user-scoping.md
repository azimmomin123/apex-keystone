# Leads page user scoping — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every signed-in user open the Leads page and see only the leads assigned to them (including "Personal" leads they add themselves). Admins keep seeing every Apex lead. Personal leads are private to their owner.

**Architecture:** Enforcement lives at the GraphQL layer via a Keystone `access.filter` rule on the `Lead` list, plus a `resolveInput` create hook that pins non-admin creations to the caller's own `Agent`. The Next.js page moves out of `app/dashboard/(admin)/admin/leads/` so the admin-only layout gate no longer applies, and the sidebar link + chrome adapt to `isAdmin`.

**Tech Stack:** Next.js 15 app router, Keystone 6, Prisma 6 / Postgres, React server components, graphql-request via `keystoneClient`.

**Spec:** `docs/superpowers/specs/2026-04-10-leads-page-user-scoping-design.md`

**Repo root for all paths in this plan:** `/Users/azimmomin/Desktop/AI-Coding/next-keystone-starter`

**No unit test framework in this repo.** Manual verification is done via (a) the Keystone GraphQL Playground at `http://localhost:3000/api/graphql`, (b) signing into the Next app as different users, and (c) reading Postgres rows directly. Every task that needs verification has concrete commands.

---

## File map

| File | Change |
|---|---|
| `migrations/20260410_add_lead_type_field/migration.sql` | **Create.** Adds `type` column to `Lead`, backfills existing rows to `'apex'`. |
| `features/keystone/models/Lead.ts` | **Modify.** Add `type` select field, add `access.filter` rules (query/update/delete), add `hooks.resolveInput` create hook. |
| `app/dashboard/(admin)/admin/leads/actions.ts` | **Move to** `app/dashboard/leads/actions.ts` **and modify.** Replace `requireAdmin()` with `requireSignedIn()` on `createLead`, `updateLeadStage`, `updateLeadFollowUp`, `updateLeadNotes`. Keep `requireAdmin()` on `assignLead` and `triggerGmailSync`. Add `type` to `CreateLeadInput`. Update `revalidatePath` calls to `/dashboard/leads`. |
| `app/dashboard/(admin)/admin/leads/page.tsx` | **Move to** `app/dashboard/leads/page.tsx` **and modify.** Fetch `authenticatedItem { isAdmin }`, pass `isAdmin` into `<LeadsView>`, drop the "Admin" breadcrumb. |
| `app/dashboard/(admin)/admin/leads/_components/leads-view.tsx` | **Move to** `app/dashboard/leads/_components/leads-view.tsx` **and modify.** Accept `isAdmin` prop; hide "All agents" filter, "Sync Gmail now" button, and the agent-dropdown inside `<CreateLeadDialog>` and `<LeadDrawer>` when `!isAdmin`. |
| `app/dashboard/(admin)/admin/leads/_components/create-lead-dialog.tsx` | **Move to** `app/dashboard/leads/_components/create-lead-dialog.tsx` **and modify.** Accept `isAdmin` prop. For non-admins: render a Personal/Apex segmented picker, hide the assigned-agent dropdown, pass `type` to `createLead`. |
| `app/dashboard/(admin)/admin/leads/_components/lead-drawer.tsx` | **Move to** `app/dashboard/leads/_components/lead-drawer.tsx` **and modify.** Accept `isAdmin` prop. Hide the assigned-agent dropdown when `!isAdmin`. |
| `app/dashboard/(admin)/admin/leads/_components/leads-kanban.tsx` | **Move to** `app/dashboard/leads/_components/leads-kanban.tsx`. No other change. |
| `app/dashboard/(admin)/admin/leads/_components/leads-table.tsx` | **Move to** `app/dashboard/leads/_components/leads-table.tsx`. No other change. |
| `app/dashboard/(admin)/admin/leads/page.tsx` (new stub at old path) | **Create after the move.** A 3-line redirect to `/dashboard/leads` so bookmarks still work. |
| `features/dashboard/components/Sidebar.tsx` | **Modify.** Move the "Leads" link out of the `{user?.isAdmin === true && ...}` Admin group and into a new top-level group shown to every signed-in user. Point `href` at `/dashboard/leads`. |

---

## Task 1: Create the Prisma migration for the `type` column

**Files:**
- Create: `migrations/20260410_add_lead_type_field/migration.sql`

This matches the style of the most recent hand-written migration in the repo (`migrations/20260409_add_admin_and_lead_intake_fields/migration.sql:1-23`).

- [ ] **Step 1: Create the migration SQL file**

Write exactly this into `migrations/20260410_add_lead_type_field/migration.sql`:

```sql
-- Add the lead type discriminator: 'apex' (shared pool) or 'personal' (private).
-- Existing rows are all backfilled to 'apex' since the feature that lets
-- non-admins create Personal leads ships in the same change set.
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'apex';

-- Defensive: if any rows somehow ended up with NULL or empty string, normalize
-- them to 'apex' so the Keystone select field never sees an unknown value.
UPDATE "Lead" SET "type" = 'apex' WHERE "type" IS NULL OR "type" = '';
```

- [ ] **Step 2: Verify no existing migration folder collides**

Run: `ls migrations/ | grep 20260410`
Expected: only `20260410_add_lead_type_field` (if nothing else is there, the command prints that one line; if nothing prints, re-check the folder name).

- [ ] **Step 3: Commit**

```bash
git add migrations/20260410_add_lead_type_field/migration.sql
git commit -m "Add Lead.type column migration (apex/personal)"
```

---

## Task 2: Add the `type` field, access filter, and create hook to the Lead schema

**Files:**
- Modify: `features/keystone/models/Lead.ts`

This is the load-bearing task. All three changes live in the same file so they ship as one atomic commit.

- [ ] **Step 1: Replace the full contents of `features/keystone/models/Lead.ts`**

Write exactly this into the file (overwrites the current 98-line file):

```ts
import { list } from '@keystone-6/core'
import { allOperations } from '@keystone-6/core/access'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { isSignedIn } from '../access'

export const Lead = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
    },
    filter: {
      query: ({ session }) => {
        if (!session) return false
        if (session.data?.isAdmin === true) {
          return { type: { equals: 'apex' } }
        }
        return { assignedTo: { user: { id: { equals: session.itemId } } } }
      },
      update: ({ session }) => {
        if (!session) return false
        if (session.data?.isAdmin === true) {
          return { type: { equals: 'apex' } }
        }
        return { assignedTo: { user: { id: { equals: session.itemId } } } }
      },
      delete: ({ session }) => {
        if (!session) return false
        if (session.data?.isAdmin === true) {
          return { type: { equals: 'apex' } }
        }
        return { assignedTo: { user: { id: { equals: session.itemId } } } }
      },
    },
  },
  hooks: {
    resolveInput: async ({ operation, resolvedData, inputData, context }) => {
      if (operation !== 'create') return resolvedData
      const session = context.session
      if (!session || session.data?.isAdmin === true) return resolvedData

      // Non-admin create: force assignedTo to the caller's own Agent.
      // findMany + take: 1 is used because Agent.user is a relation, and
      // findOne's where-input only accepts unique scalars.
      const agents = await context.sudo().query.Agent.findMany({
        where: { user: { id: { equals: session.itemId } } },
        take: 1,
        query: 'id',
      })
      const agent = agents[0]
      if (!agent) {
        throw new Error('You must be linked to an Agent profile to create a lead.')
      }

      // Read the raw client input (not resolvedData) so we can distinguish
      // "client explicitly sent type=apex" from "client omitted type and
      // the field default applied". For non-admins, the safer default is
      // 'personal' — only honor 'apex' if the client asked for it.
      const clientType = (inputData as { type?: string } | undefined)?.type
      const type = clientType === 'apex' ? 'apex' : 'personal'

      return {
        ...resolvedData,
        type,
        assignedTo: { connect: { id: agent.id } },
      }
    },
  },
  ui: {
    listView: {
      initialColumns: ['name', 'email', 'phone', 'stage', 'type', 'assignedTo', 'source'],
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text(),
    phone: text(),

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

    stage: select({
      type: 'string',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Showing', value: 'showing' },
        { label: 'Offer', value: 'offer' },
        { label: 'Closing', value: 'closing' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
      ui: { displayMode: 'segmented-control' },
    }),

    source: select({
      type: 'string',
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Website', value: 'website' },
        { label: 'Referral', value: 'referral' },
        { label: 'Cold Call', value: 'cold_call' },
      ],
    }),

    priority: select({
      type: 'string',
      defaultValue: 'medium',
      options: [
        { label: 'Hot', value: 'hot' },
        { label: 'Warm', value: 'warm' },
        { label: 'Medium', value: 'medium' },
        { label: 'Cold', value: 'cold' },
      ],
    }),

    budget: text(),
    notes: text({ ui: { displayMode: 'textarea' } }),

    // Gmail lead ingestion fields
    propertyInterest: text(),
    message: text({ ui: { displayMode: 'textarea' } }),
    followUpDate: timestamp(),
    // NOTE: isIndexed: 'unique' omitted on purpose — Keystone's unique index
    // would disallow NULLs, but manual leads have no thread ID. The unique
    // constraint is enforced by a Postgres partial unique index in the
    // migration (WHERE "emailThreadId" IS NOT NULL). Field is nullable so
    // multiple manual leads (NULL thread IDs) don't collide.
    emailThreadId: text({ db: { isNullable: true } }),

    assignedTo: relationship({
      ref: 'Agent.leads',
      many: false,
    }),

    property: relationship({
      ref: 'Property.leads',
      many: false,
    }),

    activities: relationship({
      ref: 'Activity.lead',
      many: true,
    }),

    createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    updatedAt: timestamp({
      db: { updatedAt: true },
    }),
  },
})
```

- [ ] **Step 2: Rebuild the Keystone schema**

Run: `npx keystone build --no-ui`
Expected: finishes with no errors. Regenerates `schema.prisma` and `schema.graphql` so the new `type` field is visible to Prisma and the GraphQL layer. If it fails with a type error, re-check the filter callbacks (common mistake: returning `{ equals: ... }` at the wrong nesting level).

- [ ] **Step 3: Apply the migration from Task 1**

Run: `npm run migrate`
Expected: Prisma reports `Applying migration 20260410_add_lead_type_field` and exits 0. If it says "no pending migrations", either the column was already applied in a previous run or the folder was not committed.

- [ ] **Step 4: Sanity-check the column exists in Postgres**

Run: `psql "$DATABASE_URL" -c '\d "Lead"'` (or open your preferred DB client)
Expected: the `type` column is listed as `text NOT NULL DEFAULT 'apex'`. If `DATABASE_URL` isn't exported locally, read it from `.env` first.

- [ ] **Step 5: Commit**

```bash
git add features/keystone/models/Lead.ts schema.prisma schema.graphql
git commit -m "Add Lead.type field + per-user access filter + create hook"
```

(The built `schema.prisma` and `schema.graphql` are part of the commit because other tooling reads them.)

---

## Task 3: Relax the server actions and add `type` to `CreateLeadInput`

**Files:**
- Modify: `app/dashboard/(admin)/admin/leads/actions.ts` (the folder hasn't moved yet — this task modifies it in place, Task 4 will move it)

Today every action calls `requireAdmin()` (`actions.ts:10-27`). After this change:
- `createLead`, `updateLeadStage`, `updateLeadFollowUp`, `updateLeadNotes` only require a signed-in user — the Keystone access filter enforces per-row scoping.
- `assignLead` and `triggerGmailSync` stay admin-only.

- [ ] **Step 1: Add a `requireSignedIn` helper at the top of `actions.ts`**

Open `app/dashboard/(admin)/admin/leads/actions.ts`. Find the `requireAdmin` function at lines 10-27. Directly below it, add this new helper:

```ts
async function requireSignedIn(): Promise<{ id: string; isAdmin: boolean } | { error: string }> {
  const query = `
    query SignedInGuard {
      authenticatedItem {
        ... on User {
          id
          isAdmin
        }
      }
    }
  `;
  const response = await keystoneClient(query);
  if (!response.success) return { error: 'Not authenticated' };
  const item = (response.data as any)?.authenticatedItem;
  if (!item) return { error: 'Not authenticated' };
  return { id: item.id, isAdmin: item.isAdmin === true };
}
```

- [ ] **Step 2: Add `type` to `CreateLeadInput`**

Find the `CreateLeadInput` interface (lines 29-41). Add a `type` field. Replace the whole interface with:

```ts
export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: string;
  priority?: string;
  propertyInterest?: string;
  message?: string;
  notes?: string;
  followUpDate?: string | null;
  assignedToId?: string | null;
  type?: 'apex' | 'personal';
}
```

- [ ] **Step 3: Relax `createLead` and wire `type` through**

Find the `createLead` function (lines 43-84). Replace the whole function with:

```ts
export async function createLead(
  input: CreateLeadInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireSignedIn();
  if ('error' in me) return { success: false, error: me.error };

  const name = input.name?.trim();
  if (!name) return { success: false, error: 'Lead name is required' };

  const data: Record<string, unknown> = {
    name,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    source: input.source || 'manual',
    stage: input.stage || 'new',
    priority: input.priority || 'medium',
    propertyInterest: input.propertyInterest?.trim() || null,
    message: input.message?.trim() || null,
    notes: input.notes?.trim() || null,
    followUpDate: input.followUpDate || null,
  };

  // `type` is only honored from the client when an admin isn't present —
  // the Keystone resolveInput hook is the authoritative source for non-admins.
  // Admins always create Apex leads (the dialog doesn't expose a picker),
  // so omitting `type` is fine for them; the field default 'apex' applies.
  if (input.type) {
    data.type = input.type;
  }

  // Only admins are allowed to pin assignedTo from the client. Non-admin
  // creates get assignedTo set by the resolveInput hook regardless of what
  // the client sends, but we also skip the client-side connect to keep the
  // mutation payload clean.
  if (me.isAdmin && input.assignedToId) {
    data.assignedTo = { connect: { id: input.assignedToId } };
  }

  const mutation = `
    mutation CreateLead($data: LeadCreateInput!) {
      createLead(data: $data) {
        id
      }
    }
  `;
  const response = await keystoneClient(mutation, { data });
  if (!response.success) return { success: false, error: response.error };

  const created = (response.data as any)?.createLead;
  if (!created?.id) return { success: false, error: 'Lead creation returned no id' };

  revalidatePath('/dashboard/leads');
  return { success: true, data: { id: created.id } };
}
```

- [ ] **Step 4: Relax `updateLeadStage`, `updateLeadFollowUp`, `updateLeadNotes`**

For each of these three functions, change the first line from `const me = await requireAdmin();` to `const me = await requireSignedIn();` and update the `revalidatePath` call from `/dashboard/admin/leads` to `/dashboard/leads`.

After the edits the three functions should read:

```ts
export async function updateLeadStage(leadId: string, stage: string): Promise<ActionResult> {
  const me = await requireSignedIn();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation UpdateLeadStage($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
        stage
      }
    }
  `;
  const response = await keystoneClient(mutation, { id: leadId, data: { stage } });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/leads');
  return { success: true };
}

export async function updateLeadFollowUp(
  leadId: string,
  date: string | null
): Promise<ActionResult> {
  const me = await requireSignedIn();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation UpdateLeadFollowUp($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
        followUpDate
      }
    }
  `;
  const response = await keystoneClient(mutation, {
    id: leadId,
    data: { followUpDate: date },
  });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/leads');
  return { success: true };
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<ActionResult> {
  const me = await requireSignedIn();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation UpdateLeadNotes($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
      }
    }
  `;
  const response = await keystoneClient(mutation, { id: leadId, data: { notes } });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/leads');
  return { success: true };
}
```

- [ ] **Step 5: Update `assignLead`'s revalidate path (but keep it admin-only)**

Find `assignLead` (lines 104-125). **Do not** change the `requireAdmin()` call. Only change the `revalidatePath('/dashboard/admin/leads')` at line 123 to `revalidatePath('/dashboard/leads')`.

- [ ] **Step 6: Update `triggerGmailSync`'s revalidate path (but keep it admin-only)**

Find `triggerGmailSync` (lines 175-213). **Do not** change the `requireAdmin()` call. Only change the `revalidatePath('/dashboard/admin/leads')` at line 205 to `revalidatePath('/dashboard/leads')`.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0. If there's a type error in `actions.ts`, re-read the edits and fix before continuing.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/\(admin\)/admin/leads/actions.ts
git commit -m "Relax lead action admin checks; add type to CreateLeadInput"
```

---

## Task 4: Move the leads folder and add a redirect stub

**Files:**
- Move: `app/dashboard/(admin)/admin/leads/` → `app/dashboard/leads/`
- Create: `app/dashboard/(admin)/admin/leads/page.tsx` (new stub — redirect to `/dashboard/leads`)

- [ ] **Step 1: Create the destination folder**

Run: `mkdir -p app/dashboard/leads/_components`
Expected: exits 0. The folder must exist before `git mv` into it.

- [ ] **Step 2: Move the files with `git mv` (preserves history)**

Run each command, one per line — do not batch with `&&` so any failure surfaces loudly:

```bash
git mv "app/dashboard/(admin)/admin/leads/page.tsx" app/dashboard/leads/page.tsx
git mv "app/dashboard/(admin)/admin/leads/actions.ts" app/dashboard/leads/actions.ts
git mv "app/dashboard/(admin)/admin/leads/_components/leads-view.tsx" app/dashboard/leads/_components/leads-view.tsx
git mv "app/dashboard/(admin)/admin/leads/_components/create-lead-dialog.tsx" app/dashboard/leads/_components/create-lead-dialog.tsx
git mv "app/dashboard/(admin)/admin/leads/_components/lead-drawer.tsx" app/dashboard/leads/_components/lead-drawer.tsx
git mv "app/dashboard/(admin)/admin/leads/_components/leads-kanban.tsx" app/dashboard/leads/_components/leads-kanban.tsx
git mv "app/dashboard/(admin)/admin/leads/_components/leads-table.tsx" app/dashboard/leads/_components/leads-table.tsx
```

Expected each: no output (success). If `git mv` fails because the source is still referenced as "untracked", run `git status` — the file was likely edited unstaged in Task 3. Stage it first.

- [ ] **Step 3: Verify the `_components` folder in the old path is empty and remove it**

Run: `ls "app/dashboard/(admin)/admin/leads/_components"` — expected: either no such directory or an empty listing. Then: `rmdir "app/dashboard/(admin)/admin/leads/_components"` — only if it exists.

- [ ] **Step 4: Grep for stale references to the old path**

Run: `grep -rn "dashboard/admin/leads" --include="*.ts" --include="*.tsx" app features components features` (the leading `app`/`features`/`components` cover the source tree).
Expected: only the sidebar link (`features/dashboard/components/Sidebar.tsx:236-237` — we'll fix that in Task 6) and possibly one or two leftover strings in comments. **No import paths should appear.** If any `import … from …dashboard/admin/leads…` lines come back, update them to the new path and re-run.

- [ ] **Step 5: Create the redirect stub at the old path**

Write `app/dashboard/(admin)/admin/leads/page.tsx` as a brand-new file with exactly this content:

```tsx
import { redirect } from 'next/navigation';

export default function LegacyAdminLeadsRedirect() {
  redirect('/dashboard/leads');
}
```

- [ ] **Step 6: Type-check and verify the app still builds**

Run: `npx tsc --noEmit`
Expected: exits 0. If errors reference the moved files, they are almost certainly import path issues inside the moved files (they use relative imports like `../page` which still work, or `@/components/...` which still work). Re-read the error and fix.

- [ ] **Step 7: Commit**

```bash
git add "app/dashboard/(admin)/admin/leads/page.tsx" app/dashboard/leads
git commit -m "Move leads page to /dashboard/leads; redirect old admin path"
```

---

## Task 5: Thread `isAdmin` through page.tsx, leads-view, create-lead-dialog, and lead-drawer

**Files:**
- Modify: `app/dashboard/leads/page.tsx`
- Modify: `app/dashboard/leads/_components/leads-view.tsx`
- Modify: `app/dashboard/leads/_components/create-lead-dialog.tsx`
- Modify: `app/dashboard/leads/_components/lead-drawer.tsx`

This task **must be done as one atomic commit** because the intermediate states don't type-check. Do not commit until all four files are updated.

- [ ] **Step 1: Replace the full contents of `app/dashboard/leads/page.tsx`**

Write exactly this into the file (overwrites the current 132-line file):

```tsx
export const dynamic = 'force-dynamic';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { PageContainer } from '@/features/dashboard/components/PageContainer';
import { LeadsView } from './_components/leads-view';

export interface AdminLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  priority: string | null;
  propertyInterest: string | null;
  message: string | null;
  followUpDate: string | null;
  emailThreadId: string | null;
  notes: string | null;
  type: 'apex' | 'personal';
  createdAt: string | null;
  updatedAt: string | null;
  assignedTo: { id: string; name: string } | null;
  activities: Array<{
    id: string;
    type: string;
    summary: string;
    details: string | null;
    createdAt: string | null;
    performedBy: { id: string; name: string } | null;
  }>;
}

export interface AdminAgentOption {
  id: string;
  name: string;
}

async function fetchLeadsPageData(): Promise<{
  leads: AdminLead[];
  agents: AdminAgentOption[];
  isAdmin: boolean;
  error: string | null;
}> {
  const query = `
    query LeadsPageData {
      authenticatedItem {
        ... on User {
          id
          isAdmin
        }
      }
      leads(orderBy: [{ createdAt: desc }]) {
        id
        name
        email
        phone
        stage
        source
        priority
        propertyInterest
        message
        followUpDate
        emailThreadId
        notes
        type
        createdAt
        updatedAt
        assignedTo {
          id
          name
        }
        activities(orderBy: [{ createdAt: desc }]) {
          id
          type
          summary
          details
          createdAt
          performedBy {
            id
            name
          }
        }
      }
      agents(where: { isActive: { equals: true } }, orderBy: [{ name: asc }]) {
        id
        name
      }
    }
  `;

  const response = await keystoneClient(query);
  if (!response.success) {
    return { leads: [], agents: [], isAdmin: false, error: response.error };
  }
  const data = response.data as any;
  const isAdmin = data?.authenticatedItem?.isAdmin === true;
  return {
    leads: (data?.leads as AdminLead[]) || [],
    agents: (data?.agents as AdminAgentOption[]) || [],
    isAdmin,
    error: null,
  };
}

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const initialView: 'kanban' | 'table' = resolved.view === 'table' ? 'table' : 'kanban';

  const { leads, agents, isAdmin, error } = await fetchLeadsPageData();

  const subtitle = isAdmin
    ? 'Kanban and table views of all inbound leads. Drag cards between columns to change stage.'
    : 'Kanban and table views of leads assigned to you. Drag cards between columns to change stage.';

  return (
    <PageContainer
      breadcrumbs={[
        { type: 'link', label: 'Dashboard', href: '/dashboard' },
        { type: 'page', label: 'Leads' },
      ]}
      header={
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      }
    >
      <div className="px-4 md:px-6 pb-6">
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load leads: {error}
          </div>
        ) : (
          <LeadsView
            initialLeads={leads}
            agents={agents}
            initialView={initialView}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </PageContainer>
  );
}
```

Notes on what changed vs. the old file:
- Query renamed `AdminLeadsAndAgents` → `LeadsPageData`, plus adds `authenticatedItem { id isAdmin }` and `type` on the lead selection.
- Adds `type` to the `AdminLead` interface.
- Adds `isAdmin` to the return shape of the fetcher, surfacing it to the page.
- Breadcrumbs drop the `Admin` intermediate link.
- Subtitle is `isAdmin`-aware.
- Component name `AdminLeadsPage` → `LeadsPage`.
- `<LeadsView>` is called with a new `isAdmin` prop.

- [ ] **Step 2: Update `app/dashboard/leads/_components/leads-view.tsx` — add `isAdmin` to `Props`**

Open `app/dashboard/leads/_components/leads-view.tsx`. Find the `Props` interface (currently lines 23-27). Replace it with:

```ts
interface Props {
  initialLeads: AdminLead[];
  agents: AdminAgentOption[];
  initialView: 'kanban' | 'table';
  isAdmin: boolean;
}
```

- [ ] **Step 3: Destructure `isAdmin` in `leads-view.tsx`**

On the `LeadsView` function signature line (currently line 39 — `export function LeadsView({ initialLeads, agents, initialView }: Props) {`), replace with:

```ts
export function LeadsView({ initialLeads, agents, initialView, isAdmin }: Props) {
```

- [ ] **Step 4: Gate the "All agents" filter on `isAdmin`**

Find the agent-filter `<Select>` block (currently lines 103-116). Wrap the whole `<Select value={agentFilter} onValueChange={setAgentFilter}> ... </Select>` block in `{isAdmin && ( ... )}`:

```tsx
{isAdmin && (
  <Select value={agentFilter} onValueChange={setAgentFilter}>
    <SelectTrigger className="w-48">
      <SelectValue placeholder="Agent" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All agents</SelectItem>
      <SelectItem value="unassigned">Unassigned</SelectItem>
      {agents.map((a) => (
        <SelectItem key={a.id} value={a.id}>
          {a.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

- [ ] **Step 5: Gate the "Sync Gmail now" button on `isAdmin`**

Find the sync button (currently lines 122-125):

```tsx
<Button variant="outline" onClick={handleSync} disabled={isSyncing}>
  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
  {isSyncing ? 'Syncing…' : 'Sync Gmail now'}
</Button>
```

Wrap it in `{isAdmin && ( ... )}`:

```tsx
{isAdmin && (
  <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
    {isSyncing ? 'Syncing…' : 'Sync Gmail now'}
  </Button>
)}
```

- [ ] **Step 6: Pass `isAdmin` into `<LeadDrawer>` and `<CreateLeadDialog>`**

Find `<LeadDrawer>` (currently lines 145-150) and add `isAdmin={isAdmin}`:

```tsx
<LeadDrawer
  lead={selectedLead}
  agents={agents}
  isAdmin={isAdmin}
  open={!!selectedLead}
  onClose={() => setSelectedLeadId(null)}
/>
```

Find `<CreateLeadDialog>` (currently lines 152-156) and add `isAdmin={isAdmin}`:

```tsx
<CreateLeadDialog
  open={createOpen}
  onOpenChange={setCreateOpen}
  agents={agents}
  isAdmin={isAdmin}
/>
```

- [ ] **Step 7: Update `app/dashboard/leads/_components/create-lead-dialog.tsx` — add `isAdmin` to `Props`**

Find the `Props` interface (currently lines 28-32). Replace with:

```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AdminAgentOption[];
  isAdmin: boolean;
}
```

- [ ] **Step 8: Destructure `isAdmin` and add the `leadType` state**

Update the function signature (currently line 59 — `export function CreateLeadDialog({ open, onOpenChange, agents }: Props) {`) to:

```ts
export function CreateLeadDialog({ open, onOpenChange, agents, isAdmin }: Props) {
```

Then, in the `useState` block (currently lines 63-73), add a new line for `leadType` right before `setAssignedToId`:

```ts
const [leadType, setLeadType] = useState<'apex' | 'personal'>('personal');
const [assignedToId, setAssignedToId] = useState<string>('unassigned');
```

And in the `reset()` function (currently lines 75-87), add `setLeadType('personal');` right before `setAssignedToId('unassigned');`:

```ts
const reset = () => {
  setName('');
  setEmail('');
  setPhone('');
  setSource('cold_call');
  setStage('new');
  setPriority('medium');
  setPropertyInterest('');
  setNotes('');
  setMessage('');
  setFollowUpDate('');
  setLeadType('personal');
  setAssignedToId('unassigned');
};
```

- [ ] **Step 9: Pass `type` to the `createLead` call**

Inside the `handleSubmit` function, find the call to `createLead` (currently lines 97-109). Replace the whole call with:

```ts
const res = await createLead({
  name,
  email,
  phone,
  source,
  stage,
  priority,
  propertyInterest,
  message,
  notes,
  followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
  assignedToId: isAdmin ? (assignedToId === 'unassigned' ? null : assignedToId) : null,
  type: isAdmin ? 'apex' : leadType,
});
```

- [ ] **Step 10: Add the Personal/Apex picker for non-admins**

Find the `<div className="grid grid-cols-3 gap-4">` that holds Source/Stage/Priority (currently starts at line 173). Directly *above* it, add this new block:

```tsx
{!isAdmin && (
  <div className="grid gap-2">
    <Label>Lead type</Label>
    <Select value={leadType} onValueChange={(v) => setLeadType(v as 'apex' | 'personal')}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="personal">
          Personal — only visible to you
        </SelectItem>
        <SelectItem value="apex">
          Apex — shared with the team
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 11: Gate the "Assigned agent" dropdown on `isAdmin` (in the create dialog)**

Find the "Assigned agent" block (currently lines 221-236):

```tsx
<div className="grid gap-2">
  <Label>Assigned agent</Label>
  <Select value={assignedToId} onValueChange={setAssignedToId}>
    ...
  </Select>
</div>
```

Wrap the whole `<div>` in `{isAdmin && ( ... )}`:

```tsx
{isAdmin && (
  <div className="grid gap-2">
    <Label>Assigned agent</Label>
    <Select value={assignedToId} onValueChange={setAssignedToId}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 12: Update `app/dashboard/leads/_components/lead-drawer.tsx` — add `isAdmin` to `Props`**

Find the `Props` interface (currently lines 32-37). Replace with:

```ts
interface Props {
  lead: AdminLead | null;
  agents: AdminAgentOption[];
  isAdmin: boolean;
  open: boolean;
  onClose: () => void;
}
```

- [ ] **Step 13: Destructure `isAdmin` in `lead-drawer.tsx`**

Update the function signature (currently line 63 — `export function LeadDrawer({ lead, agents, open, onClose }: Props) {`) to:

```ts
export function LeadDrawer({ lead, agents, isAdmin, open, onClose }: Props) {
```

- [ ] **Step 14: Gate the "Assigned agent" block on `isAdmin` (in the drawer)**

Find the "Assigned agent" block (currently lines 177-192):

```tsx
<div>
  <Label htmlFor="lead-agent">Assigned agent</Label>
  <Select value={assignedTo} onValueChange={setAssignedTo}>
    ...
  </Select>
</div>
```

Wrap it in `{isAdmin && ( ... )}`:

```tsx
{isAdmin && (
  <div>
    <Label htmlFor="lead-agent">Assigned agent</Label>
    <Select value={assignedTo} onValueChange={setAssignedTo}>
      <SelectTrigger id="lead-agent">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 15: Guard `handleSave` so non-admins never fire an `assignLead` call**

Inside `handleSave` (currently lines 81-116), find the block that calls `assignLead` (currently lines 88-92):

```ts
const desiredAgent = assignedTo === 'unassigned' ? null : assignedTo;
const currentAgent = lead.assignedTo?.id ?? null;
if (desiredAgent !== currentAgent) {
  ops.push(assignLead(lead.id, desiredAgent));
}
```

Replace with:

```ts
if (isAdmin) {
  const desiredAgent = assignedTo === 'unassigned' ? null : assignedTo;
  const currentAgent = lead.assignedTo?.id ?? null;
  if (desiredAgent !== currentAgent) {
    ops.push(assignLead(lead.id, desiredAgent));
  }
}
```

This is belt-and-suspenders: the dropdown is already hidden for non-admins so `assignedTo` stays at its initial value, but `assignLead` is still an admin-only server action and would return 403 if fired by a non-admin for any reason.

- [ ] **Step 16: Type-check the whole tree**

Run: `npx tsc --noEmit`
Expected: exits 0. If anything still fails, re-read the error and fix before continuing — do not commit a broken tree.

- [ ] **Step 17: Commit Task 5 as one atomic change**

```bash
git add app/dashboard/leads
git commit -m "Pass isAdmin through leads page; hide admin-only chrome for users"
```

---

## Task 6: Update the sidebar — move Leads out of the Admin group

**Files:**
- Modify: `features/dashboard/components/Sidebar.tsx`

- [ ] **Step 1: Add a new "Leads" top-level nav group shown to every signed-in user**

Open `features/dashboard/components/Sidebar.tsx`. Find the "Dashboard Home Link" `SidebarGroup` (currently lines 115-126). Directly *after* its closing `</SidebarGroup>` (line 126), insert a new leads group:

```tsx
{/* Leads — visible to every signed-in user; scoped per-user by Keystone access filter */}
<SidebarGroup>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isLinkActive('/dashboard/leads')}>
        <Link href="/dashboard/leads" onClick={() => setOpenMobile(false)}>
          <Inbox className="h-4 w-4" />
          <span>Leads</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarGroup>
```

`Inbox` is already imported at line 39 of the current file (`import { Home, Database, ChevronRight, Package, Users, Inbox } from 'lucide-react'`), so no import changes are needed.

- [ ] **Step 2: Remove the old Leads item from the Admin group**

Find the Admin section (currently lines 222-245). Delete the leads `SidebarMenuItem` block (currently lines 235-242):

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={isLinkActive('/dashboard/admin/leads')}>
    <Link href="/dashboard/admin/leads" onClick={() => setOpenMobile(false)}>
      <Inbox className="h-4 w-4" />
      <span>Leads</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

After deletion, the Admin group should only contain the Users `SidebarMenuItem`. Everything else in the Admin group stays the same.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add features/dashboard/components/Sidebar.tsx
git commit -m "Show Leads link to every signed-in user in sidebar"
```

---

## Task 7: Manual verification

No test framework exists in this repo, so verification is hands-on. Do each step — if any fails, do **not** create a PR; go back and fix the offending task first.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: `keystone build --no-ui` runs, then `prisma migrate deploy` runs (with "0 migrations applied" if Task 2 Step 3 already applied them), then Next starts on `http://localhost:3000`. Watch for any red errors in the terminal — the page should be reachable at `http://localhost:3000/dashboard/leads` once it boots.

- [ ] **Step 2: Seed test data in Postgres**

You need at least: one admin user, one non-admin user linked to an Agent, some Apex leads assigned to different agents, no Personal leads yet. If your dev DB already has users, use them. Otherwise, seed via the Keystone admin UI or GraphQL playground. Record the admin's email/password and the non-admin's email/password before moving on.

Quick GraphQL playground queries to check state (open `http://localhost:3000/api/graphql`):

```graphql
query { users { id name email isAdmin } }
query { agents { id name user { id email } } }
query { leads { id name type assignedTo { id name user { id email } } } }
```

- [ ] **Step 3: Verify — admin sees all Apex leads**

Sign in as the admin. Navigate to `http://localhost:3000/dashboard/leads`.
Expected:
  - Page renders (no redirect).
  - Breadcrumb shows `Dashboard > Leads` (no "Admin" step).
  - Subtitle says "… all inbound leads …".
  - Sidebar shows Leads in its own top-level group.
  - "All agents" filter dropdown is visible.
  - "Sync Gmail now" button is visible.
  - "New lead" dialog has NO Personal/Apex picker, and has an "Assigned agent" dropdown.
  - All Apex leads in the database show up in the Kanban/Table.

- [ ] **Step 4: Verify — non-admin sees only their assigned leads**

Sign out. Sign in as the agent-linked non-admin.
Expected:
  - Sidebar shows Leads.
  - Navigate to `/dashboard/leads` — page renders.
  - Subtitle says "… leads assigned to you …".
  - "All agents" filter is NOT visible.
  - "Sync Gmail now" button is NOT visible.
  - Only Apex leads whose `assignedTo.user.id` equals the signed-in user's id appear. If the agent is assigned to 1 of 3 Apex leads, exactly 1 lead shows.

- [ ] **Step 5: Verify — non-admin can create a Personal lead**

Still signed in as the non-admin. Click "New lead". Expected:
  - Dialog opens.
  - A "Lead type" picker is visible above Source/Stage/Priority, defaulting to "Personal".
  - "Assigned agent" dropdown is NOT visible.
Fill in name "Personal Test Lead" and submit.
Expected:
  - Toast says "Lead 'Personal Test Lead' created".
  - The new lead appears in the user's list.

- [ ] **Step 6: Verify — admin does NOT see the Personal lead**

Sign out. Sign in as the admin. Navigate to `/dashboard/leads`.
Expected: "Personal Test Lead" is nowhere in the list (not Kanban, not Table, not in the raw GraphQL response).

Double-check via the GraphQL playground, signed in as admin:
```graphql
query { leads { id name type } }
```
Expected: the Personal lead does not appear.

- [ ] **Step 7: Verify — non-admin can create an Apex lead and admin sees it**

Sign in as the non-admin. Create another lead, picking "Apex" in the type picker. Name it "Apex Test Lead".
Expected: appears in the user's own list.

Sign out, sign in as admin, navigate to `/dashboard/leads`.
Expected: "Apex Test Lead" is visible to the admin.

- [ ] **Step 8: Verify — the old URL redirects**

While still signed in, navigate to `http://localhost:3000/dashboard/admin/leads`.
Expected: the browser lands on `/dashboard/leads`.

- [ ] **Step 9: Verify — GraphQL enforcement cannot be bypassed**

In the GraphQL playground, signed in as the non-admin, run:
```graphql
mutation {
  createLead(data: {
    name: "Smuggled Apex Lead"
    type: apex
    assignedTo: { connect: { id: "SOME_OTHER_AGENT_ID" } }
  }) {
    id
    type
    assignedTo { id user { id } }
  }
}
```
Expected: lead is created but `assignedTo` is the **caller's own Agent id**, NOT `SOME_OTHER_AGENT_ID`. This proves the `resolveInput` hook is active. Then:
```graphql
mutation {
  updateLead(
    where: { id: "ID_OF_AN_APEX_LEAD_NOT_ASSIGNED_TO_CALLER" }
    data: { stage: "won" }
  ) {
    id
  }
}
```
Expected: error or `null` — the `filter.update` rule blocks it. If the mutation succeeds, the access filter is wrong; go back to Task 2 and fix before continuing.

- [ ] **Step 10: Final lint and typecheck pass**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0.

- [ ] **Step 11: (no commit)**

Verification doesn't produce any files. If Steps 1-10 all passed, the feature is ready. If you want to roll up a quick "verification done" marker, add a note to the PR description instead of creating a commit.

---

## Out of scope (do not attempt in this plan)

- Scoping of `Activity`, `Property`, or similar relation lists at the top level.
- Role-flag-based gating (`role.canManageLeads` / `role.canManageAllLeads`) — deferred, noted in the spec.
- Adding a test framework. Manual verification is sufficient for this change set; adding vitest/jest is a bigger project and would delay this feature.
- UI polish like a "Personal" badge on kanban cards — a follow-up if the user asks.
