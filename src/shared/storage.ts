// chrome.storage.local 래퍼. Phase 0에서는 최소 read/write만.
// Day 8~9에서 캐시 관리 (LRU, TTL) 추가.

import type { StorageData } from './types'

export async function getStorage(): Promise<Partial<StorageData>> {
  return (await chrome.storage.local.get(null)) as Partial<StorageData>
}

export async function setStorage(patch: Partial<StorageData>): Promise<void> {
  await chrome.storage.local.set(patch)
}
