import { usePolledApi } from '../lib/api.js'
import { EMAIL_ACCOUNTS, EMAILS } from '../data/mock.js'

const FALLBACK = { accounts: EMAIL_ACCOUNTS, emails: EMAILS }

export function useEmails() {
  const { isLive, data } = usePolledApi('/api/emails', 60_000, FALLBACK)
  return { isLive, accounts: data.accounts, emails: data.emails }
}
