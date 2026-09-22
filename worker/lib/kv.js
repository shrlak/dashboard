// Token/account storage backed by a Workers KV namespace bound as `TOKENS`
// (see wrangler.toml). Same tiny async get/set/delete shape the Express
// backend used, so google.js is otherwise unchanged.

export async function getRecord(env, key) {
  const raw = await env.TOKENS.get(key)
  return raw ? JSON.parse(raw) : null
}

export async function setRecord(env, key, value) {
  await env.TOKENS.put(key, JSON.stringify(value))
}

export async function deleteRecord(env, key) {
  await env.TOKENS.delete(key)
}
