/**
 * Admin Firebase Auth UIDs — set `VITE_ADMIN_UIDS` in `.env.local` (comma-separated).
 * Example: VITE_ADMIN_UIDS=abc123,def456
 */
const raw = import.meta.env.VITE_ADMIN_UIDS ?? ''
export const ADMIN_IDS = raw
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
