import { api } from '@/lib/apiClient'
import type {
  AdminDashboardStats,
  AdminPosition,
  AdminPositionCreate,
  AdminUserFinancialProfile,
  AdminUserRow,
  BalanceAdjustmentRequest,
  Page,
  UserFinancialSettings,
} from '@/types/admin'
import type { Order, Position } from '@/types/trading'
import type { TradingAccount } from '@/types/account'
import type { AdminWithdrawal } from '@/types/withdrawal'
import type { LedgerEntry } from '@/types/wallet'

export const adminService = {
  getStats: () => api.get<AdminDashboardStats>('/admin/stats'),

  listUsers: (search: string, page: number, pageSize: number) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (search) params.set('search', search)
    return api.get<Page<AdminUserRow>>(`/admin/users?${params.toString()}`)
  },

  getUser: (userId: string) => api.get<AdminUserRow>(`/admin/users/${userId}`),

  getFinancialProfile: (userId: string) => api.get<AdminUserFinancialProfile>(`/admin/users/${userId}/financial-profile`),

  adjustBalance: (userId: string, payload: BalanceAdjustmentRequest) =>
    api.post<{ id: string; transaction_id: string }>(`/admin/users/${userId}/balance-adjustments`, payload),

  getUserTransactions: (userId: string) => api.get<LedgerEntry[]>(`/admin/users/${userId}/transactions`),

  getUserPositions: (userId: string) => api.get<Position[]>(`/admin/users/${userId}/positions`),

  getUserOrders: (userId: string) => api.get<Order[]>(`/admin/users/${userId}/orders`),

  listAdminPositions: () => api.get<AdminPosition[]>('/admin/positions'),

  createAdminPosition: (payload: AdminPositionCreate) => api.post<AdminPosition>('/admin/positions', payload),

  updateAdminPosition: (positionId: string, payload: Partial<AdminPositionCreate>) =>
    api.patch<AdminPosition>(`/admin/positions/${positionId}`, payload),

  deleteAdminPosition: (positionId: string) => api.delete<void>(`/admin/positions/${positionId}`),

  setFinancialSettings: (userId: string, payload: UserFinancialSettings) =>
    api.put<UserFinancialSettings>(`/admin/users/${userId}/financial-settings`, payload),

  listAuditLogs: () => api.get<Record<string, unknown>[]>('/admin/audit-logs'),

  // Position Manipulation - Real-time profit/loss control
  forceProfit: (positionId: string, amount: number, reason?: string) =>
    api.post<Position>(`/admin/positions/${positionId}/force-profit`, { amount, reason }),

  forceLoss: (positionId: string, amount: number, reason?: string) =>
    api.post<Position>(`/admin/positions/${positionId}/force-loss`, { amount, reason }),

  setPositionPrice: (positionId: string, price: number, reason?: string) =>
    api.post<Position>(`/admin/positions/${positionId}/set-price`, { price, reason }),

  updateUserStatus: (userId: string, status: string, reason?: string) =>
    api.patch<{ success: boolean; status: string; sessions_revoked: number }>(
      `/admin/users/${userId}/status`,
      { status, reason },
    ),

  /** Permanently deletes a user and everything belonging to them. The reason
   *  is required by the server and recorded in the audit log. */
  deleteUser: (userId: string, reason: string) =>
    api.delete<{ success: boolean; deleted: Record<string, number> }>(
      `/admin/users/${userId}`,
      { reason },
    ),

  listUserAccounts: (userId: string) =>
    api.get<TradingAccount[]>(`/admin/users/${userId}/accounts`),

  setAccountLeverage: (accountId: string, leverage: number, reason?: string) =>
    api.patch<TradingAccount>(`/admin/accounts/${accountId}/leverage`, { leverage, reason }),

  adjustAccountBonus: (accountId: string, amount: number, reason: string) =>
    api.post<TradingAccount>(`/admin/accounts/${accountId}/bonus`, { amount, reason }),

  listWithdrawals: (statusFilter?: string) =>
    api.get<AdminWithdrawal[]>(`/withdrawals/admin/queue${statusFilter ? `?status_filter=${statusFilter}` : ''}`),

  approveWithdrawal: (id: string, adminNote?: string) =>
    api.post<AdminWithdrawal>(`/withdrawals/admin/${id}/approve`, { admin_note: adminNote }),

  rejectWithdrawal: (id: string, reason: string) =>
    api.post<AdminWithdrawal>(`/withdrawals/admin/${id}/reject`, { reason }),

  completeWithdrawal: (id: string, transactionReference?: string) =>
    api.post<AdminWithdrawal>(`/withdrawals/admin/${id}/complete`, { transaction_reference: transactionReference }),

  updateUserVerification: (userId: string, isVerified: boolean) =>
    api.patch<{ success: boolean; is_verified: boolean }>(`/admin/users/${userId}/verification`, { is_verified: isVerified }),
}
