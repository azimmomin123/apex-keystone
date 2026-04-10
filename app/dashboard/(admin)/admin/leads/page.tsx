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

async function fetchLeadsAndAgents(): Promise<{
  leads: AdminLead[];
  agents: AdminAgentOption[];
  error: string | null;
}> {
  const query = `
    query AdminLeadsAndAgents {
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
    return { leads: [], agents: [], error: response.error };
  }
  const data = response.data as any;
  return {
    leads: (data?.leads as AdminLead[]) || [],
    agents: (data?.agents as AdminAgentOption[]) || [],
    error: null,
  };
}

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const initialView: 'kanban' | 'table' = resolved.view === 'table' ? 'table' : 'kanban';

  const { leads, agents, error } = await fetchLeadsAndAgents();

  return (
    <PageContainer
      breadcrumbs={[
        { type: 'link', label: 'Dashboard', href: '/dashboard' },
        { type: 'link', label: 'Admin', href: '/dashboard/admin' },
        { type: 'page', label: 'Leads' },
      ]}
      header={
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Kanban and table views of all inbound leads. Drag cards between columns to change stage.
          </p>
        </div>
      }
    >
      <div className="px-4 md:px-6 pb-6">
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load leads: {error}
          </div>
        ) : (
          <LeadsView initialLeads={leads} agents={agents} initialView={initialView} />
        )}
      </div>
    </PageContainer>
  );
}
