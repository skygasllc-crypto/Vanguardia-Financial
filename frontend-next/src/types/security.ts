export interface Session {
  id: string
  device_name: string | null
  user_agent: string | null
  ip_address: string | null
  is_active: boolean
  last_active_at: string | null
  created_at: string
  is_current: boolean
}

export interface LoginHistoryEntry {
  id: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  failure_reason: string | null
  is_suspicious: boolean
  created_at: string
}
