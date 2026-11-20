import { create } from 'zustand'

type UIState = {
  lastUploadNotice: string | null
  setLastUploadNotice: (msg: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  lastUploadNotice: null,
  setLastUploadNotice: (msg) => set({ lastUploadNotice: msg }),
}))