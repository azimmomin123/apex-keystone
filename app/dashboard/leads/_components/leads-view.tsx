'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, LayoutGrid, Rows3, Plus } from 'lucide-react';
import type { AdminLead, AdminAgentOption } from '../page';
import { LeadsKanban } from './leads-kanban';
import { LeadsTable } from './leads-table';
import { LeadDrawer } from './lead-drawer';
import { CreateLeadDialog } from './create-lead-dialog';
import { triggerGmailSync } from '../actions';

interface Props {
  initialLeads: AdminLead[];
  agents: AdminAgentOption[];
  initialView: 'kanban' | 'table';
}

const SOURCE_OPTIONS = [
  { label: 'All sources', value: 'all' },
  { label: 'Manual', value: 'manual' },
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'Cold Call', value: 'cold_call' },
];

export function LeadsView({ initialLeads, agents, initialView }: Props) {
  const [view, setView] = useState<'kanban' | 'table'>(initialView);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSyncing, startSync] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialLeads.filter((lead) => {
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
      if (agentFilter !== 'all') {
        if (agentFilter === 'unassigned') {
          if (lead.assignedTo) return false;
        } else if (lead.assignedTo?.id !== agentFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        (lead.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [initialLeads, search, sourceFilter, agentFilter]);

  const selectedLead = selectedLeadId
    ? initialLeads.find((l) => l.id === selectedLeadId) ?? null
    : null;

  const handleSync = () => {
    startSync(async () => {
      const res = await triggerGmailSync();
      if (res.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <div className="flex-1" />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New lead
        </Button>
        <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync Gmail now'}
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'table')}>
        <TabsList>
          <TabsTrigger value="kanban">
            <LayoutGrid className="mr-2 h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="table">
            <Rows3 className="mr-2 h-4 w-4" /> Table
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          <LeadsKanban leads={filtered} onOpenLead={setSelectedLeadId} />
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <LeadsTable leads={filtered} onOpenLead={setSelectedLeadId} />
        </TabsContent>
      </Tabs>

      <LeadDrawer
        lead={selectedLead}
        agents={agents}
        open={!!selectedLead}
        onClose={() => setSelectedLeadId(null)}
      />

      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        agents={agents}
      />
    </>
  );
}
