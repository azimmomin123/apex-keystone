'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminLead, AdminAgentOption } from '../page';
import {
  updateLeadStage,
  assignLead,
  updateLeadFollowUp,
  updateLeadNotes,
} from '../actions';

interface Props {
  lead: AdminLead | null;
  agents: AdminAgentOption[];
  open: boolean;
  onClose: () => void;
}

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'showing', label: 'Showing' },
  { value: 'offer', label: 'Offer' },
  { value: 'closing', label: 'Closing' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export function LeadDrawer({ lead, agents, open, onClose }: Props) {
  const [stage, setStage] = useState<string>('new');
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [followUp, setFollowUp] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (lead) {
      setStage(lead.stage);
      setAssignedTo(lead.assignedTo?.id ?? 'unassigned');
      setFollowUp(toDateInput(lead.followUpDate));
      setNotes(lead.notes ?? '');
    }
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null;

  const handleSave = () => {
    startTransition(async () => {
      const ops: Array<Promise<{ success: boolean; error?: string }>> = [];

      if (stage !== lead.stage) {
        ops.push(updateLeadStage(lead.id, stage));
      }
      const desiredAgent = assignedTo === 'unassigned' ? null : assignedTo;
      const currentAgent = lead.assignedTo?.id ?? null;
      if (desiredAgent !== currentAgent) {
        ops.push(assignLead(lead.id, desiredAgent));
      }
      const desiredFollowUp = followUp ? new Date(followUp).toISOString() : null;
      const currentFollowUp = lead.followUpDate ?? null;
      if (desiredFollowUp !== currentFollowUp) {
        ops.push(updateLeadFollowUp(lead.id, desiredFollowUp));
      }
      if ((notes ?? '') !== (lead.notes ?? '')) {
        ops.push(updateLeadNotes(lead.id, notes));
      }

      if (ops.length === 0) {
        toast.info('No changes to save');
        return;
      }

      const results = await Promise.all(ops);
      const failed = results.find((r) => !r.success);
      if (failed) {
        toast.error(failed.error || 'One or more updates failed');
      } else {
        toast.success('Lead updated');
        onClose();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{lead.name}</SheetTitle>
          <SheetDescription>
            {lead.email || '—'} {lead.phone ? ` · ${lead.phone}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {lead.source.replace('_', ' ')}
            </Badge>
            {lead.priority && (
              <Badge variant="secondary" className="capitalize">
                {lead.priority}
              </Badge>
            )}
            {lead.emailThreadId && (
              <Badge variant="outline" className="font-mono text-[10px]">
                thread: {lead.emailThreadId.slice(0, 12)}…
              </Badge>
            )}
          </div>

          {lead.propertyInterest && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Property interest</div>
              <div className="text-sm">{lead.propertyInterest}</div>
            </div>
          )}

          {lead.message && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Inbound message</div>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs font-sans">
                {lead.message}
              </pre>
            </div>
          )}

          <div>
            <Label htmlFor="lead-stage">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger id="lead-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div>
            <Label htmlFor="lead-follow-up">Follow-up date</Label>
            <Input
              id="lead-follow-up"
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Activities</div>
            {lead.activities.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                No activity yet
              </div>
            ) : (
              <ul className="space-y-2">
                {lead.activities.map((act) => (
                  <li key={act.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize">{act.type.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">
                        {act.createdAt ? new Date(act.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">{act.summary}</div>
                    {act.details && (
                      <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {act.details}
                      </div>
                    )}
                    {act.performedBy && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        by {act.performedBy.name}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 flex gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
