// Tiny in-memory TTL cache so panel polling doesn't hammer upstream APIs.
const store = new Map()

export async function cached(key, ttlMs, fn) {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value
  const value = await fn()
  store.set(key, { at: Date.now(), value })
  return value
}
