'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Copy, Check } from 'lucide-react';
import { createUser } from '../actions';

type Mode = 'form' | 'credentials';

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('form');
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: '', email: '', phone: '', isAdmin: false });
  const [creds, setCreds] = useState<{ email: string; tempPassword: string; copied: boolean }>({
    email: '',
    tempPassword: '',
    copied: false,
  });

  const reset = () => {
    setMode('form');
    setForm({ name: '', email: '', phone: '', isAdmin: false });
    setCreds({ email: '', tempPassword: '', copied: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createUser({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        isAdmin: form.isAdmin,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setCreds({ email: res.data.email, tempPassword: res.data.tempPassword, copied: false });
      setMode('credentials');
      toast.success('User created');
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Email: ${creds.email}\nTemporary password: ${creds.tempPassword}`
      );
      setCreds((c) => ({ ...c, copied: true }));
      toast.success('Credentials copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          // Allow the close animation to play before resetting state
          setTimeout(reset, 150);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        {mode === 'form' ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                A one-time temporary password will be generated. Share it with the user securely — it
                will only be shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-user-name">Name</Label>
                <Input
                  id="new-user-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-user-email">Email</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-user-phone">Phone (optional)</Label>
                <Input
                  id="new-user-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="new-user-admin"
                  checked={form.isAdmin}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isAdmin: v === true }))}
                />
                <Label htmlFor="new-user-admin" className="cursor-pointer">
                  Grant admin access
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create user'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>User created</DialogTitle>
              <DialogDescription>
                Copy these credentials now. The temporary password will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-mono text-sm">{creds.email}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Temporary password</div>
                <div className="font-mono text-sm break-all">{creds.tempPassword}</div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCopy} variant={creds.copied ? 'secondary' : 'default'}>
                {creds.copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy credentials
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
