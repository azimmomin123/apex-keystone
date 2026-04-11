'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AdminLead } from '../page';
import { updateLeadStage } from '../actions';
import { cn } from '@/lib/utils';

interface Props {
  leads: AdminLead[];
  onOpenLead: (id: string) => void;
}

const STAGES: Array<{ value: string; label: string; color: string }> = [
  { value: 'new', label: 'New', color: 'bg-slate-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
  { value: 'showing', label: 'Showing', color: 'bg-violet-500' },
  { value: 'offer', label: 'Offer', color: 'bg-amber-500' },
  { value: 'closing', label: 'Closing', color: 'bg-orange-500' },
  { value: 'won', label: 'Won', color: 'bg-emerald-500' },
  { value: 'lost', label: 'Lost', color: 'bg-rose-500' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export function LeadsKanban({ leads, onOpenLead }: Props) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const byStage = new Map<string, AdminLead[]>();
  for (const stage of STAGES) byStage.set(stage.value, []);
  for (const lead of leads) {
    const bucket = byStage.get(lead.stage) ?? byStage.get('new')!;
    bucket.push(lead);
  }

  const handleDrop = (stage: string) => {
    const leadId = draggedLeadId;
    setDraggedLeadId(null);
    setDragOverStage(null);
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    startTransition(async () => {
      const res = await updateLeadStage(leadId, stage);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success(`Moved to ${STAGES.find((s) => s.value === stage)?.label ?? stage}`);
      }
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {STAGES.map((stage) => {
        const items = byStage.get(stage.value) ?? [];
        return (
          <div
            key={stage.value}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-2 transition',
              dragOverStage === stage.value && 'border-primary bg-primary/5',
              isPending && 'opacity-70'
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.value);
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={() => handleDrop(stage.value)}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className={cn('h-2 w-2 rounded-full', stage.color)} />
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <Badge variant="secondary" className="ml-auto">
                {items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {items.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  No leads
                </div>
              )}
              {items.map((lead) => (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={() => setDraggedLeadId(lead.id)}
                  onDragEnd={() => setDraggedLeadId(null)}
                  onClick={() => onOpenLead(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenLead(lead.id);
                    }
                  }}
                  className={cn(
                    'cursor-grab rounded-md border bg-background p-3 text-left shadow-sm transition hover:border-primary/50',
                    draggedLeadId === lead.id && 'opacity-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{lead.name}</div>
                      {lead.email && (
                        <div className="truncate text-xs text-muted-foreground">{lead.email}</div>
                      )}
                    </div>
                    {lead.assignedTo ? (
                      <Avatar className="h-6 w-6 text-[10px]">
                        <AvatarFallback>{initials(lead.assignedTo.name)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-6 w-6 text-[10px]">
                        <AvatarFallback className="bg-muted text-muted-foreground">?</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {lead.type === 'personal' && (
                      <Badge
                        variant="outline"
                        className="border-purple-300 bg-purple-50 text-[10px] text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      >
                        Personal
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {lead.source.replace('_', ' ')}
                    </Badge>
                    {lead.priority && (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {lead.priority}
                      </Badge>
                    )}
                  </div>
                  {lead.propertyInterest && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {truncate(lead.propertyInterest, 60)}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {lead.createdAt
                        ? `received ${formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}`
                        : ''}
                    </span>
                    {lead.followUpDate && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                        f/u {new Date(lead.followUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
