'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

interface SessionUser {
  id: string;
  isAdmin: boolean;
}

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? {} : { data: T }))
  | { success: false; error: string };

/**
 * Read the current session user, pulling isAdmin so we can enforce that
 * every mutation here is performed by an admin.
 */
async function getCurrentAdmin(): Promise<SessionUser | null> {
  const query = `
    query CurrentAdmin {
      authenticatedItem {
        ... on User {
          id
          isAdmin
        }
      }
    }
  `;
  const response = await keystoneClient(query);
  if (!response.success) return null;
  const item = (response.data as any)?.authenticatedItem;
  if (!item) return null;
  return { id: item.id, isAdmin: item.isAdmin === true };
}

async function requireAdmin(): Promise<SessionUser | { error: string }> {
  const me = await getCurrentAdmin();
  if (!me) return { error: 'Not authenticated' };
  if (!me.isAdmin) return { error: 'Forbidden: admin access required' };
  return me;
}

function generateTempPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  const query = `
    query ActiveAdminCount($where: UserWhereInput!) {
      usersCount(where: $where)
    }
  `;
  const where: any = {
    isAdmin: { equals: true },
    isActive: { equals: true },
  };
  if (excludeUserId) {
    where.id = { not: { equals: excludeUserId } };
  }
  const response = await keystoneClient(query, { where });
  if (!response.success) return 0;
  return ((response.data as any)?.usersCount as number) ?? 0;
}

interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  isAdmin?: boolean;
}

export async function createUser(
  input: CreateUserInput
): Promise<ActionResult<{ id: string; email: string; tempPassword: string }>> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  if (!input.name?.trim()) return { success: false, error: 'Name is required' };
  if (!input.email?.trim()) return { success: false, error: 'Email is required' };

  const tempPassword = generateTempPassword();

  const mutation = `
    mutation CreateAdminUser($data: UserCreateInput!) {
      createUser(data: $data) {
        id
        email
      }
    }
  `;
  const variables = {
    data: {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      isAdmin: !!input.isAdmin,
      isActive: true,
      mustChangePassword: true,
      password: tempPassword,
    },
  };

  const response = await keystoneClient(mutation, variables);
  if (!response.success) return { success: false, error: response.error };

  const created = (response.data as any)?.createUser;
  if (!created?.id) return { success: false, error: 'User creation returned no id' };

  revalidatePath('/dashboard/admin/users');

  return {
    success: true,
    data: { id: created.id, email: created.email, tempPassword },
  };
}

export async function toggleUserAdmin(userId: string, value: boolean): Promise<ActionResult> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  if (userId === me.id && value === false) {
    return { success: false, error: 'You cannot remove your own admin access' };
  }

  // If we're demoting someone else from admin, make sure there's still at
  // least one other active admin.
  if (value === false) {
    const remaining = await countActiveAdmins(userId);
    if (remaining === 0) {
      return { success: false, error: 'Cannot demote the last active admin' };
    }
  }

  const mutation = `
    mutation UpdateUserAdmin($id: ID!, $data: UserUpdateInput!) {
      updateUser(where: { id: $id }, data: $data) {
        id
        isAdmin
      }
    }
  `;
  const response = await keystoneClient(mutation, { id: userId, data: { isAdmin: value } });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function toggleUserActive(userId: string, value: boolean): Promise<ActionResult> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  if (userId === me.id && value === false) {
    return { success: false, error: 'You cannot deactivate your own account' };
  }

  // If deactivating an admin, make sure another active admin remains.
  if (value === false) {
    const query = `
      query UserIsAdmin($id: ID!) {
        user(where: { id: $id }) {
          id
          isAdmin
        }
      }
    `;
    const lookup = await keystoneClient(query, { id: userId });
    if (!lookup.success) return { success: false, error: lookup.error };
    const target = (lookup.data as any)?.user;
    if (target?.isAdmin) {
      const remaining = await countActiveAdmins(userId);
      if (remaining === 0) {
        return { success: false, error: 'Cannot deactivate the last admin' };
      }
    }
  }

  const mutation = `
    mutation UpdateUserActive($id: ID!, $data: UserUpdateInput!) {
      updateUser(where: { id: $id }, data: $data) {
        id
        isActive
      }
    }
  `;
  const response = await keystoneClient(mutation, { id: userId, data: { isActive: value } });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function resetUserPassword(
  userId: string
): Promise<ActionResult<{ tempPassword: string; email: string }>> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const tempPassword = generateTempPassword();

  const mutation = `
    mutation ResetUserPassword($id: ID!, $data: UserUpdateInput!) {
      updateUser(where: { id: $id }, data: $data) {
        id
        email
      }
    }
  `;
  const response = await keystoneClient(mutation, {
    id: userId,
    data: { password: tempPassword, mustChangePassword: true },
  });
  if (!response.success) return { success: false, error: response.error };

  const updated = (response.data as any)?.updateUser;
  if (!updated?.id) return { success: false, error: 'Password reset returned no user' };

  revalidatePath('/dashboard/admin/users');
  return { success: true, data: { tempPassword, email: updated.email } };
}
