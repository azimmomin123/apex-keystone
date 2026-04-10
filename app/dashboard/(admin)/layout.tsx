export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { getAdminMetaAction, getAuthenticatedUser } from '@/features/dashboard/actions';

export default async function ListLayout({ children }: { children: React.ReactNode }) {
  // Fetch adminMeta and user data server-side to avoid loading states
  const [adminMetaResponse, userResponse] = await Promise.all([
    getAdminMetaAction(),
    getAuthenticatedUser()
  ]);

  const adminMeta = adminMetaResponse.success ? adminMetaResponse.data : null;
  const user = userResponse.success ? userResponse.data?.authenticatedItem : null;

  // Force users with a temp password to the change-password gate before they
  // can see any dashboard content. Catches both invited users and users whose
  // password was reset by an admin while they were already signed in.
  if (user?.mustChangePassword === true) {
    redirect('/dashboard/force-reset');
  }

  return (
    <DashboardLayout adminMeta={adminMeta} authenticatedItem={user}>
      {children}
    </DashboardLayout>
  );
}