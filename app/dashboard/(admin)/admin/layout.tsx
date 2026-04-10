export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

/**
 * Admin shell layout — gates the entire /dashboard/admin/* subtree to
 * users with session.data.isAdmin === true. The dashboard layout one
 * level up (features/dashboard/components/DashboardLayout.tsx) already
 * renders the sidebar/chrome, so this layout is intentionally minimal.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Fetch the current user with isAdmin field directly, since the shared
  // getAuthenticatedUser() helper doesn't request that field.
  const query = `
    query AdminGuard {
      authenticatedItem {
        ... on User {
          id
          isAdmin
        }
      }
    }
  `;
  const response = await keystoneClient(query);
  const user = response.success ? (response.data as any)?.authenticatedItem : null;

  if (!user || user.isAdmin !== true) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
