import { list } from '@keystone-6/core'
import { allOperations } from '@keystone-6/core/access'
import { checkbox, relationship, text } from '@keystone-6/core/fields'

import { isSignedIn } from '../access'

export const Agent = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
    },
  },
  ui: {
    listView: {
      initialColumns: ['name', 'email', 'phone', 'specialty', 'area', 'isActive'],
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text({ isIndexed: 'unique', validation: { isRequired: true } }),
    phone: text(),
    specialty: text(),
    area: text(),
    telegramId: text(),
    isActive: checkbox({ defaultValue: true }),

    user: relationship({
      ref: 'User',
      many: false,
    }),

    leads: relationship({
      ref: 'Lead.assignedTo',
      many: true,
    }),
  },
})
