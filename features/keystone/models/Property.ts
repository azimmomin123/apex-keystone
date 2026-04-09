import { list } from '@keystone-6/core'
import { allOperations } from '@keystone-6/core/access'
import { float, integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'

import { isSignedIn } from '../access'

export const Property = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
    },
  },
  ui: {
    listView: {
      initialColumns: ['address', 'type', 'price', 'status', 'bedrooms'],
    },
  },
  fields: {
    address: text({ validation: { isRequired: true } }),
    city: text(),
    state: text(),
    zip: text(),

    type: select({
      type: 'string',
      defaultValue: 'single_family',
      options: [
        { label: 'Single Family', value: 'single_family' },
        { label: 'Condo', value: 'condo' },
        { label: 'Townhouse', value: 'townhouse' },
        { label: 'Multi-Family', value: 'multi_family' },
        { label: 'Land', value: 'land' },
        { label: 'Commercial', value: 'commercial' },
      ],
    }),

    status: select({
      type: 'string',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Sold', value: 'sold' },
        { label: 'Off Market', value: 'off_market' },
      ],
    }),

    price: float(),
    bedrooms: integer(),
    bathrooms: float(),
    sqft: integer(),
    yearBuilt: integer(),
    description: text({ ui: { displayMode: 'textarea' } }),
    mlsNumber: text(),

    agent: relationship({
      ref: 'User',
      many: false,
    }),

    leads: relationship({
      ref: 'Lead.property',
      many: true,
    }),

    createdAt: timestamp({ defaultValue: { kind: 'now' } }),
  },
})
