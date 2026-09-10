import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AccountType = 'demo' | 'real'

interface AccountTypeStore {
  accountType: AccountType
  setAccountType: (type: AccountType) => void
}

export const useAccountTypeStore = create<AccountTypeStore>()(
  persist(
    (set) => ({
      accountType: 'demo',
      setAccountType: (type) => set({ accountType: type }),
    }),
    {
      name: 'account-type-storage',
    }
  )
)
