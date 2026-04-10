export const dynamic = 'force-dynamic';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { PageContainer } from '@/features/dashboard/components/PageContainer';
import { UsersTable } from './_components/users-table';
import { CreateUserDialog } from './_components/create-user-dialog';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string | null;
}

async function fetchUsers(): Promise<{ users: AdminUser[]; error: string | null }> {
  // Keystone lists don't expose createdAt on User by default (there's no
  // createdAt field on the model) — we query only the fields that exist.
  const query = `
    query AdminUsers {
      users(orderBy: [{ name: asc }]) {
        id
        name
        email
        phone
        isAdmin
        isActive
        mustChangePassword
      }
    }
  `;

  const response = await keystoneClient(query);
  if (!response.success) {
    return { users: [], error: response.error };
  }
  return { users: ((response.data as any)?.users as AdminUser[]) || [], error: null };
}

export default async function AdminUsersPage() {
  const { users, error } = await fetchUsers();

  return (
    <PageContainer
      breadcrumbs={[
        { type: 'link', label: 'Dashboard', href: '/dashboard' },
        { type: 'link', label: 'Admin', href: '/dashboard/admin' },
        { type: 'page', label: 'Users' },
      ]}
      header={
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage administrator and agent accounts. New users receive a one-time temporary password.
            </p>
          </div>
          <CreateUserDialog />
        </div>
      }
    >
      <div className="px-4 md:px-6">
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load users: {error}
          </div>
        ) : (
          <UsersTable users={users} />
        )}
      </div>
    </PageContainer>
  );
}
