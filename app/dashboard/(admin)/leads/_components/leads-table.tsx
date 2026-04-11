'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import type { AdminLead } from '../page';
import { cn } from '@/lib/utils';

interface Props {
  leads: AdminLead[];
  onOpenLead: (id: string) => void;
}

type SortKey =
  | 'createdAt'
  | 'source'
  | 'name'
  | 'email'
  | 'phone'
  | 'propertyInterest'
  | 'assignedTo'
  | 'stage'
  | 'followUpDate';

type SortDir = 'asc' | 'desc';

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-slate-500',
  contacted: 'bg-blue-500',
  qualified: 'bg-indigo-500',
  showing: 'bg-violet-500',
  offer: 'bg-amber-500',
  closing: 'bg-orange-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500',
};

const PAGE_SIZE = 25;

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function LeadsTable({ leads, onOpenLead }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...leads];
    const getVal = (lead: AdminLead): string | number => {
      switch (sortKey) {
        case 'createdAt':
          return lead.createdAt ? new Date(lead.createdAt).getTime() : 0;
        case 'source':
          return lead.source ?? '';
        case 'name':
          return lead.name?.toLowerCase() ?? '';
        case 'email':
          return lead.email?.toLowerCase() ?? '';
        case 'phone':
          return lead.phone ?? '';
        case 'propertyInterest':
          return lead.propertyInterest?.toLowerCase() ?? '';
        case 'assignedTo':
          return lead.assignedTo?.name.toLowerCase() ?? '';
        case 'stage':
          return lead.stage ?? '';
        case 'followUpDate':
          return lead.followUpDate ? new Date(lead.followUpDate).getTime() : 0;
      }
    };
    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [leads, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleExport = () => {
    const header = [
      'Date Received',
      'Source',
      'Lead Name',
      'Email',
      'Phone',
      'Property Interest',
      'Message',
      'Assigned Agent',
      'Stage',
      'Follow-Up Date',
      'Notes',
      'Email Thread ID',
    ];
    const rows = sorted.map((lead) => [
      lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
      lead.source,
      lead.name,
      lead.email ?? '',
      lead.phone ?? '',
      lead.propertyInterest ?? '',
      lead.message ?? '',
      lead.assignedTo?.name ?? '',
      lead.stage,
      lead.followUpDate ? new Date(lead.followUpDate).toISOString() : '',
      lead.notes ?? '',
      lead.emailThreadId ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {sorted.length} lead{sorted.length === 1 ? '' : 's'}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('createdAt')}>
                Date Received{sortIcon('createdAt')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('source')}>
                Source{sortIcon('source')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                Lead Name{sortIcon('name')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('email')}>
                Email{sortIcon('email')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('phone')}>
                Phone{sortIcon('phone')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('propertyInterest')}>
                Property Interest{sortIcon('propertyInterest')}
              </TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('assignedTo')}>
                Assigned Agent{sortIcon('assignedTo')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('stage')}>
                Status{sortIcon('stage')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('followUpDate')}>
                Follow-Up Date{sortIcon('followUpDate')}
              </TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Email Thread ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                  No leads match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => onOpenLead(lead.id)}
                >
                  <TableCell className="whitespace-nowrap text-xs">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {lead.source.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{lead.name}</span>
                      {lead.type === 'personal' && (
                        <Badge
                          variant="outline"
                          className="border-purple-300 bg-purple-50 text-[10px] text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        >
                          Personal
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{lead.email ?? ''}</TableCell>
                  <TableCell className="text-xs">{lead.phone ?? ''}</TableCell>
                  <TableCell className="text-xs">{truncate(lead.propertyInterest, 40)}</TableCell>
                  <TableCell className="text-xs">
                    {lead.message ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{truncate(lead.message, 60)}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm whitespace-pre-wrap">
                          {lead.message}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      ''
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{lead.assignedTo?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={cn('capitalize text-white', STAGE_COLORS[lead.stage] ?? 'bg-slate-500')}>
                      {lead.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : ''}
                  </TableCell>
                  <TableCell className="text-xs">{truncate(lead.notes, 60)}</TableCell>
                  <TableCell className="text-xs">
                    {lead.emailThreadId ? (
                      <code
                        className="rounded bg-muted px-1 py-0.5 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(lead.emailThreadId!);
                        }}
                        title="Click to copy"
                      >
                        {truncate(lead.emailThreadId, 16)}
                      </code>
                    ) : (
                      ''
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </TooltipProvider>
  );
}
