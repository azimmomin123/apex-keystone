export type Session = {
  itemId: string
  listKey: string
  data: {
    name: string
    isAdmin: boolean
    mustChangePassword: boolean
    role: {
      id: string
      name: string
      canManageLeads: boolean
      canManageAllLeads: boolean
      canSeeOtherPeople: boolean
      canEditOtherPeople: boolean
      canManagePeople: boolean
      canManageRoles: boolean
      canAccessDashboard: boolean
    }
  }
}

type AccessArgs = {
  session?: Session
}

export function isSignedIn({ session }: AccessArgs) {
  return Boolean(session)
}

export const permissions = {
  canManageLeads: ({ session }: AccessArgs) => session?.data.role?.canManageLeads ?? false,
  canManageAllLeads: ({ session }: AccessArgs) => session?.data.role?.canManageAllLeads ?? false,
  canManagePeople: ({ session }: AccessArgs) => session?.data.role?.canManagePeople ?? false,
  canManageRoles: ({ session }: AccessArgs) => session?.data.role?.canManageRoles ?? false,
  isAdmin: ({ session }: AccessArgs) => session?.data?.isAdmin === true,
}

export const rules = {
  canReadPeople: ({ session }: AccessArgs) => {
    if (!session) return false
    if (session.data.role?.canSeeOtherPeople) return true
    return { id: { equals: session.itemId } }
  },
  canUpdatePeople: ({ session }: AccessArgs) => {
    if (!session) return false
    if (session.data.role?.canEditOtherPeople) return true
    return { id: { equals: session.itemId } }
  },
}
