import { list } from '@keystone-6/core'
import { allOperations } from '@keystone-6/core/access'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { isSignedIn } from '../access'

export const Activity = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
    },
  },
  ui: {
    listView: {
      initialColumns: ['type', 'lead', 'summary', 'performedBy', 'createdAt'],
    },
  },
  fields: {
    type: select({
      type: 'string',
      validation: { isRequired: true },
      options: [
        { label: 'Email Sent', value: 'email_sent' },
        { label: 'Email Received', value: 'email_received' },
        { label: 'Call Made', value: 'call_made' },
        { label: 'Call Received', value: 'call_received' },
        { label: 'WhatsApp Sent', value: 'whatsapp_sent' },
        { label: 'WhatsApp Received', value: 'whatsapp_received' },
        { label: 'Showing Scheduled', value: 'showing_scheduled' },
        { label: 'Showing Completed', value: 'showing_completed' },
        { label: 'Offer Made', value: 'offer_made' },
        { label: 'Note Added', value: 'note' },
        { label: 'Stage Changed', value: 'stage_change' },
        { label: 'Assignment Changed', value: 'assignment_change' },
      ],
    }),

    summary: text({ validation: { isRequired: true } }),
    details: text({ ui: { displayMode: 'textarea' } }),

    lead: relationship({
      ref: 'Lead.activities',
      many: false,
    }),

    performedBy: relationship({
      ref: 'User',
      many: false,
    }),

    createdAt: timestamp({ defaultValue: { kind: 'now' } }),
  },
})
