import { list } from '@keystone-6/core'
import { allOperations } from '@keystone-6/core/access'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { isSignedIn } from '../access'

export const Lead = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
    },
  },
  ui: {
    listView: {
      initialColumns: ['name', 'email', 'phone', 'stage', 'assignedTo', 'source'],
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text(),
    phone: text(),

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

    assignedTo: relationship({
      ref: 'User',
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
