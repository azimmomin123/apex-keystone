/**
 * ItemPage - Server Component
 * Based on Keystone's ItemPage but adapted for server-side rendering
 */

import { getItemAction } from '../../actions/getItemAction'
import { getListByPath } from '../../actions/getListByPath'
import { getAdminMetaAction, getItemValidationAction } from '../../actions'
import { notFound } from 'next/navigation'
import { ItemPageClient } from './ItemPageClient'

interface ItemPageParams {
  params: Promise<{
    listKey: string
    id: string
  }>
}

export async function ItemPage({ params }: ItemPageParams) {
  const resolvedParams = await params
  const listKey = resolvedParams.listKey
  const itemId = resolvedParams.id

  const list = await getListByPath(listKey)

  if (!list) {
    notFound()
  }

  // Fetch item data with cache options
  const cacheOptions = {
    next: {
      tags: [`item-${list.key}-${itemId}`],
      revalidate: 3600,
    },
  }

  // Use the working dashboard action for item data
  const response = await getItemAction(list, itemId, {}, cacheOptions)

  let fetchedItem: Record<string, unknown> = {}

  if (response.success) {
    fetchedItem = response.data.item as Record<string, unknown>
  } else {
    console.error('Error fetching item:', response.error)
    fetchedItem = {}
  }

  // Get adminMeta for the list structure
  const adminMetaResponse = await getAdminMetaAction(list.key)
  
  // Get item-specific validation data (including isRequired)
  const validationResponse = await getItemValidationAction(list.key, itemId)
  
  // Extract the list with proper field metadata if successful
  const adminMetaList = adminMetaResponse.success ? adminMetaResponse.data.list : null
  
  // Create enhanced list with validation data
  let enhancedList = adminMetaList || list
  
  // Add validation data to the enhanced list.
  // Rebuild the fields record immutably so that the merged itemView (which
  // carries the per-item fieldMode computed with the caller's session) is
  // actually the identity visible to the client component. The previous
  // shape mutated `enhancedList.fields[fieldPath].itemView` in place; that
  // worked when the field objects were local but broke once
  // getAdminMetaAction started memoizing its response via React's cache() —
  // Next ended up serializing the pre-mutation references to the client,
  // so the role field always hydrated with fieldMode: null and the
  // relationship combobox rendered as editable for non-admins.
  if (validationResponse.success && enhancedList.fields) {
    const mergedFields: Record<string, any> = {}
    for (const [fieldPath, field] of Object.entries(enhancedList.fields as Record<string, any>)) {
      const validation = validationResponse.data?.[fieldPath]
      if (validation) {
        mergedFields[fieldPath] = {
          ...field,
          itemView: {
            ...field.itemView,
            ...validation,
          },
        }
      } else {
        mergedFields[fieldPath] = field
      }
    }
    enhancedList = { ...enhancedList, fields: mergedFields }
  }

  return (
    <ItemPageClient
      list={enhancedList}
      item={fetchedItem}
      itemId={itemId}
    />
  )
}

export default ItemPage