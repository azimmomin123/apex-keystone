'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MoreHorizontal, Copy, Check } from 'lucide-react';
import {
  toggleUserAdmin,
  toggleUserActive,
  resetUserPassword,
} from '../actions';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string | null;
}

interface Props {
  users: AdminUser[];
}

export function UsersTable({ users }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pendingRow, setPendingRow] = useState<string | null>(null);
  const [resetState, setResetState] = useState<{
    open: boolean;
    email: string;
    tempPassword: string;
    copied: boolean;
  }>({ open: false, email: '', tempPassword: '', copied: false });

  const handleToggleAdmin = (user: AdminUser, value: boolean) => {
    setPendingRow(user.id);
    startTransition(async () => {
      const res = await toggleUserAdmin(user.id, value);
      setPendingRow(null);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success(`${user.name} is now ${value ? 'an admin' : 'a standard user'}`);
      }
    });
  };

  const handleToggleActive = (user: AdminUser, value: boolean) => {
    setPendingRow(user.id);
    startTransition(async () => {
      const res = await toggleUserActive(user.id, value);
      setPendingRow(null);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success(`${user.name} is now ${value ? 'active' : 'inactive'}`);
      }
    });
  };

  const handleResetPassword = (user: AdminUser) => {
    if (!confirm(`Generate a new temporary password for ${user.email}?`)) return;
    startTransition(async () => {
      const res = await resetUserPassword(user.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setResetState({
        open: true,
        email: res.data.email,
        tempPassword: res.data.tempPassword,
        copied: false,
      });
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Email: ${resetState.email}\nTemporary password: ${resetState.tempPassword}`
      );
      setResetState((s) => ({ ...s, copied: true }));
      toast.success('Credentials copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const rowPending = pendingRow === user.id && isPending;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isAdmin}
                        disabled={rowPending}
                        onCheckedChange={(v) => handleToggleAdmin(user, v)}
                        aria-label={`Toggle admin for ${user.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        disabled={rowPending}
                        onCheckedChange={(v) => handleToggleActive(user, v)}
                        aria-label={`Toggle active for ${user.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      {user.mustChangePassword ? (
                        <Badge variant="secondary">Must change password</Badge>
                      ) : (
                        <Badge variant="outline">Ready</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={rowPending}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            Reset password
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={resetState.open}
        onOpenChange={(o) => !o && setResetState({ open: false, email: '', tempPassword: '', copied: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password generated</DialogTitle>
            <DialogDescription>
              Copy these credentials now — the password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-mono text-sm">{resetState.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Temporary password</div>
              <div className="font-mono text-sm break-all">{resetState.tempPassword}</div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCopy} variant={resetState.copied ? 'secondary' : 'default'}>
              {resetState.copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy credentials
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
