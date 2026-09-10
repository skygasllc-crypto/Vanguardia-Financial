import { api } from '@/lib/apiClient'
import type { LoginHistoryEntry, Session } from '@/types/security'

export const securityService = {
  changePassword: (current_password: string, new_password: string) =>
    api.post<void>('/security/change-password', { current_password, new_password }),

  setupTwoFactor: () => api.post<{ secret: string; otpauth_url: string }>('/security/2fa/setup'),

  verifyTwoFactor: (code: string) => api.post<void>('/security/2fa/verify', { code }),

  disableTwoFactor: () => api.post<void>('/security/2fa/disable'),

  listSessions: () => api.get<Session[]>('/security/sessions'),

  revokeSession: (sessionId: string) => api.delete<void>(`/security/sessions/${sessionId}`),

  loginHistory: () => api.get<LoginHistoryEntry[]>('/security/login-history'),
}
