'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createLead } from '../actions';
import type { AdminAgentOption } from '../page';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AdminAgentOption[];
}

const SOURCES = [
  { label: 'Manual', value: 'manual' },
  { label: 'Phone Call', value: 'cold_call' },
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
];

const STAGES = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Showing', value: 'showing' },
  { label: 'Offer', value: 'offer' },
  { label: 'Closing', value: 'closing' },
];

const PRIORITIES = [
  { label: 'Hot', value: 'hot' },
  { label: 'Warm', value: 'warm' },
  { label: 'Medium', value: 'medium' },
  { label: 'Cold', value: 'cold' },
];

export function CreateLeadDialog({ open, onOpenChange, agents }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('cold_call');
  const [stage, setStage] = useState('new');
  const [priority, setPriority] = useState('medium');
  const [propertyInterest, setPropertyInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('unassigned');

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSource('cold_call');
    setStage('new');
    setPriority('medium');
    setPropertyInterest('');
    setNotes('');
    setMessage('');
    setFollowUpDate('');
    setAssignedToId('unassigned');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Lead name is required');
      return;
    }

    startTransition(async () => {
      const res = await createLead({
        name,
        email,
        phone,
        source,
        stage,
        priority,
        propertyInterest,
        message,
        notes,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        assignedToId: assignedToId === 'unassigned' ? null : assignedToId,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Lead "${name}" created`);
      reset();
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Manually add a lead from a phone call, walk-in, or anywhere else.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-name">
              Lead name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
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
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Assigned agent</Label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger>
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

          <div className="grid gap-2">
            <Label htmlFor="lead-property">Property interest</Label>
            <Input
              id="lead-property"
              value={propertyInterest}
              onChange={(e) => setPropertyInterest(e.target.value)}
              placeholder="3BR near Memorial Park"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-message">Message / call notes</Label>
            <Textarea
              id="lead-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Caller said they saw the sign on Westheimer…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lead-followup">Follow-up date</Label>
              <Input
                id="lead-followup"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-notes">Internal notes</Label>
              <Input
                id="lead-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
