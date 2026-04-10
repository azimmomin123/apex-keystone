import { redirect } from 'next/navigation';
import { Logo } from '@/features/dashboard/components/Logo';
import { getAuthenticatedUser } from '@/features/dashboard/actions';
import { ForceResetForm } from './_components/force-reset-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function ForceResetPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  const destination = typeof from === 'string' && from.startsWith('/') ? from : '/dashboard';

  const response = await getAuthenticatedUser();
  const user = response.success ? (response.data as any)?.authenticatedItem : null;

  if (!user) {
    redirect(`/dashboard/signin?from=${encodeURIComponent(`/dashboard/force-reset?from=${destination}`)}`);
  }

  // If the user doesn't actually need to change their password, don't make
  // them sit on this page — just send them through.
  if (user.mustChangePassword !== true) {
    redirect(destination);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center space-x-1.5">
          <Logo aria-hidden="true" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-foreground">
          Set a new password
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account was created with a temporary password. Choose a new one
          before continuing.
        </p>
        <ForceResetForm destination={destination} />
      </div>
    </div>
  );
}
