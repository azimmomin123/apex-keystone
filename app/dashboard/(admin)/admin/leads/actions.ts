'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? {} : { data: T }))
  | { success: false; error: string };

async function requireAdmin(): Promise<{ id: string } | { error: string }> {
  const query = `
    query AdminGuard {
      authenticatedItem {
        ... on User {
          id
          isAdmin
        }
      }
    }
  `;
  const response = await keystoneClient(query);
  if (!response.success) return { error: 'Not authenticated' };
  const item = (response.data as any)?.authenticatedItem;
  if (!item) return { error: 'Not authenticated' };
  if (item.isAdmin !== true) return { error: 'Forbidden: admin access required' };
  return { id: item.id };
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: string;
  priority?: string;
  propertyInterest?: string;
  message?: string;
  notes?: string;
  followUpDate?: string | null;
  assignedToId?: string | null;
}

export async function createLead(
  input: CreateLeadInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const name = input.name?.trim();
  if (!name) return { success: false, error: 'Lead name is required' };

  const data: Record<string, unknown> = {
    name,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    source: input.source || 'manual',
    stage: input.stage || 'new',
    priority: input.priority || 'medium',
    propertyInterest: input.propertyInterest?.trim() || null,
    message: input.message?.trim() || null,
    notes: input.notes?.trim() || null,
    followUpDate: input.followUpDate || null,
  };

  if (input.assignedToId) {
    data.assignedTo = { connect: { id: input.assignedToId } };
  }

  const mutation = `
    mutation CreateLead($data: LeadCreateInput!) {
      createLead(data: $data) {
        id
      }
    }
  `;
  const response = await keystoneClient(mutation, { data });
  if (!response.success) return { success: false, error: response.error };

  const created = (response.data as any)?.createLead;
  if (!created?.id) return { success: false, error: 'Lead creation returned no id' };

  revalidatePath('/dashboard/admin/leads');
  return { success: true, data: { id: created.id } };
}

export async function updateLeadStage(leadId: string, stage: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation UpdateLeadStage($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
        stage
      }
    }
  `;
  const response = await keystoneClient(mutation, { id: leadId, data: { stage } });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/admin/leads');
  return { success: true };
}

export async function assignLead(
  leadId: string,
  agentId: string | null
): Promise<ActionResult> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation AssignLead($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
      }
    }
  `;
  const data = agentId
    ? { assignedTo: { connect: { id: agentId } } }
    : { assignedTo: { disconnect: true } };
  const response = await keystoneClient(mutation, { id: leadId, data });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/admin/leads');
  return { success: true };
}

export async function updateLeadFollowUp(
  leadId: string,
  date: string | null
): Promise<ActionResult> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation UpdateLeadFollowUp($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
        followUpDate
      }
    }
  `;
  const response = await keystoneClient(mutation, {
    id: leadId,
    data: { followUpDate: date },
  });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/admin/leads');
  return { success: true };
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const mutation = `
    mutation UpdateLeadNotes($id: ID!, $data: LeadUpdateInput!) {
      updateLead(where: { id: $id }, data: $data) {
        id
      }
    }
  `;
  const response = await keystoneClient(mutation, { id: leadId, data: { notes } });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath('/dashboard/admin/leads');
  return { success: true };
}

/**
 * Triggers the DenchClaw Gmail leads sync job.
 *
 * Required env vars:
 *   DC_BASE_URL        — e.g. https://denchclaw.example.com
 *   DC_TRIGGER_TOKEN   — bearer token shared with the DC trigger endpoint
 */
export async function triggerGmailSync(): Promise<ActionResult<{ message: string }>> {
  const me = await requireAdmin();
  if ('error' in me) return { success: false, error: me.error };

  const baseUrl = process.env.DC_BASE_URL;
  const token = process.env.DC_TRIGGER_TOKEN;

  if (!baseUrl || !token) {
    return {
      success: false,
      error: 'Gmail sync is not configured (DC_BASE_URL / DC_TRIGGER_TOKEN missing)',
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/triggers/gmail-leads-sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        success: false,
        error: `Gmail sync trigger failed (${response.status}): ${body || response.statusText}`,
      };
    }
    revalidatePath('/dashboard/admin/leads');
    return { success: true, data: { message: 'Gmail sync triggered' } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error triggering Gmail sync',
    };
  }
}
