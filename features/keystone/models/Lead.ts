import { list } from '@keystone-6/core'
import { allOperations } from '@keystone-6/core/access'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { isSignedIn } from '../access'

export const Lead = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
    },
    filter: {
      query: ({ session }) => {
        if (!session) return false
        if (session.data?.isAdmin === true) {
          return { type: { equals: 'apex' } }
        }
        return { assignedTo: { user: { id: { equals: session.itemId } } } }
      },
      update: ({ session }) => {
        if (!session) return false
        if (session.data?.isAdmin === true) {
          return { type: { equals: 'apex' } }
        }
        return { assignedTo: { user: { id: { equals: session.itemId } } } }
      },
      delete: ({ session }) => {
        if (!session) return false
        if (session.data?.isAdmin === true) {
          return { type: { equals: 'apex' } }
        }
        return { assignedTo: { user: { id: { equals: session.itemId } } } }
      },
    },
  },
  hooks: {
    resolveInput: async ({ operation, resolvedData, inputData, context }) => {
      if (operation !== 'create') return resolvedData
      const session = context.session
      if (!session || session.data?.isAdmin === true) return resolvedData

      // Non-admin create: force assignedTo to the caller's own Agent.
      // findMany + take: 1 is used because Agent.user is a relation, and
      // findOne's where-input only accepts unique scalars.
      const agents = await context.sudo().query.Agent.findMany({
        where: { user: { id: { equals: session.itemId } } },
        take: 1,
        query: 'id',
      })
      const agent = agents[0]
      if (!agent) {
        throw new Error('You must be linked to an Agent profile to create a lead.')
      }

      // Read the raw client input (not resolvedData) so we can distinguish
      // "client explicitly sent type=apex" from "client omitted type and
      // the field default applied". For non-admins, the safer default is
      // 'personal' — only honor 'apex' if the client asked for it.
      const clientType = (inputData as { type?: string } | undefined)?.type
      const type = clientType === 'apex' ? 'apex' : 'personal'

      return {
        ...resolvedData,
        type,
        assignedTo: { connect: { id: agent.id } },
      }
    },
  },
  ui: {
    listView: {
      initialColumns: ['name', 'email', 'phone', 'stage', 'type', 'assignedTo', 'source'],
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text(),
    phone: text(),

    type: select({
      type: 'string',
      defaultValue: 'apex',
      options: [
        { label: 'Apex', value: 'apex' },
        { label: 'Personal', value: 'personal' },
      ],
      validation: { isRequired: true },
      ui: { displayMode: 'segmented-control' },
    }),

    stage: select({
      type: 'string',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Showing', value: 'showing' },
        { label: 'Offer', value: 'offer' },
        { label: 'Closing', value: 'closing' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
      ui: { displayMode: 'segmented-control' },
    }),

    source: select({
      type: 'string',
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Website', value: 'website' },
        { label: 'Referral', value: 'referral' },
        { label: 'Cold Call', value: 'cold_call' },
      ],
    }),

    priority: select({
      type: 'string',
      defaultValue: 'medium',
      options: [
        { label: 'Hot', value: 'hot' },
        { label: 'Warm', value: 'warm' },
        { label: 'Medium', value: 'medium' },
        { label: 'Cold', value: 'cold' },
      ],
    }),

    budget: text(),
    notes: text({ ui: { displayMode: 'textarea' } }),

    // Gmail lead ingestion fields
    propertyInterest: text(),
    message: text({ ui: { displayMode: 'textarea' } }),
    followUpDate: timestamp(),
    // NOTE: isIndexed: 'unique' omitted on purpose — Keystone's unique index
    // would disallow NULLs, but manual leads have no thread ID. The unique
    // constraint is enforced by a Postgres partial unique index in the
    // migration (WHERE "emailThreadId" IS NOT NULL). Field is nullable so
    // multiple manual leads (NULL thread IDs) don't collide.
    emailThreadId: text({ db: { isNullable: true } }),

    assignedTo: relationship({
      ref: 'Agent.leads',
      many: false,
    }),

    property: relationship({
      ref: 'Property.leads',
      many: false,
    }),

    activities: relationship({
      ref: 'Activity.lead',
      many: true,
    }),

    createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    updatedAt: timestamp({
      db: { updatedAt: true },
    }),
  },
})
