/**
 * HomePage for Dashboard 2 - Server Component
 */

import React from 'react'
import { PageContainer } from '../../components/PageContainer'

export async function HomePage() {
  const header = (
    <div className="flex flex-col">
      <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
    </div>
  )

  const breadcrumbs = [
    { type: 'page' as const, label: 'Dashboard' }
  ]

  return (
    <PageContainer title="Dashboard" header={header} breadcrumbs={breadcrumbs}>
      <div className="w-full max-w-4xl p-4 md:p-6" />
    </PageContainer>
  )
}

export default HomePage