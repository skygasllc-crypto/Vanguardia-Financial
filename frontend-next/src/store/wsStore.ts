import { create } from 'zustand'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface WsState {
  status: ConnectionStatus
  setStatus: (status: ConnectionStatus) => void
}

export const useWsStore = create<WsState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}))
