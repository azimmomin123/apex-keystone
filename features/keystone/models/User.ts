import { list } from '@keystone-6/core'
import { allOperations, denyAll } from '@keystone-6/core/access'
import { checkbox, password, relationship, select, text } from '@keystone-6/core/fields'

import { isSignedIn, permissions, rules } from '../access'
import type { Session } from '../access'

export const User = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
      create: (args) => {
        // Allow public sign-ups if environment variable is set to true
        if (process.env.PUBLIC_SIGNUPS_ALLOWED === 'true') {
          return true;
        }
        // Otherwise, require admin (app is invite-only; admin creates users from the admin Users page)
        return permissions.isAdmin(args);
      },
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
    },
  },
  ui: {
    hideCreate: args => !permissions.canManagePeople(args),
    hideDelete: args => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ['name', 'email', 'phone', 'specialty', 'area', 'isActive'],
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        // canEditOtherPeople can edit other people
        if (session?.data.role?.canEditOtherPeople) return 'edit'

        // edit themselves
        if (session?.itemId === item?.id) return 'edit'

        // else, default all fields to read mode
        return 'read'
      },
    },
  },
  fields: {
    name: text({
      validation: {
        isRequired: true,
      },
    }),
    email: text({
      isFilterable: false,
      isOrderable: false,
      isIndexed: 'unique',
      validation: {
        isRequired: true,
      },
    }),
    password: password({
      access: {
        read: denyAll,
        update: ({ session, item }) =>
          permissions.canManagePeople({ session }) || session?.itemId === item.id,
      },
      validation: { isRequired: true },
    }),
    role: relationship({
      ref: 'Role.assignedTo',
      access: {
        // Only actual admins can assign or change a user's role — including
        // their own. A user with role.canManagePeople=true but isAdmin=false
        // was previously able to change roles (including their own) which
        // is a privilege-escalation hole.
        create: permissions.isAdmin,
        update: permissions.isAdmin,
      },
      ui: {
        itemView: {
          fieldMode: args => (permissions.isAdmin(args) ? 'edit' : 'read'),
        },
      },
    }),
    phone: text(),
    specialty: text(),
    area: text(),
    isActive: checkbox({ defaultValue: true }),
    isAdmin: checkbox({
      defaultValue: false,
      access: {
        // Any signed-in user can read (so the session can include it)
        read: isSignedIn,
        // Only admins can grant/revoke admin
        create: permissions.isAdmin,
        update: permissions.isAdmin,
      },
    }),
    mustChangePassword: checkbox({ defaultValue: false }),
  },
});