import { redirect } from 'next/navigation';

export default function LegacyAdminLeadsRedirect() {
  redirect('/dashboard/leads');
}
