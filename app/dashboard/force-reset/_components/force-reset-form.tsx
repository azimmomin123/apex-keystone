'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { RiLoader2Fill } from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { changeOwnPassword } from '@/features/dashboard/actions';

interface Props {
  destination: string;
}

export function ForceResetForm({ destination }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const res = await changeOwnPassword(password);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push(destination);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="password" className="text-sm font-medium">
          New password
        </Label>
        <div className="relative mt-2">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pr-10 bg-muted/40"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirm" className="text-sm font-medium">
          Confirm new password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          className="mt-2 bg-muted/40"
          required
        />
      </div>

      <Button type="submit" className="w-full py-2 font-medium" disabled={pending}>
        {pending ? (
          <RiLoader2Fill className="size-4 shrink-0 animate-spin" />
        ) : (
          'Update password and continue'
        )}
      </Button>

      {error && (
        <Badge
          variant="destructive"
          className="hover:bg-destructive/10 bg-destructive/5 flex text-base items-start gap-2 border border-destructive/50 p-4 rounded-sm mt-4"
        >
          <div className="flex flex-col gap-1">
            <h2 className="uppercase tracking-wider font-semibold text-sm">Error</h2>
            <span className="break-all text-sm opacity-75 font-normal">{error}</span>
          </div>
        </Badge>
      )}
    </form>
  );
}
