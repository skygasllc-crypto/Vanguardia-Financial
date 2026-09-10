export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deactivated' | 'banned'
export type UserRole = 'user' | 'admin' | 'super_admin'
export type RiskStatus = 'normal' | 'watch' | 'high_risk'

export interface User {
  id: string
  display_id: string // User-facing ID (e.g., AB1234)
  email: string
  username: string
  full_name: string
  phone: string | null
  status: UserStatus
  role: UserRole
  risk_status: RiskStatus
  is_verified: boolean
  two_factor_enabled: boolean
  theme_preference: string
  created_at: string
  last_login_at: string | null
}
