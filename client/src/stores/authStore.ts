import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string;
  fullNameAr: string;
  role: {
    id: string;
    name: string;
    nameAr: string;
    level: number;
  };
  branchId: string | null;
  geographicScope: string[] | null;
}

interface AuthStore {
  accessToken: string | null;
  user: UserState | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, user: UserState) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<UserState>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null, // Keep in-memory for security (will be restored by refresh on start)
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
      updateUser: (updatedFields) => 
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null
        }))
    }),
    {
      name: 'al-basha-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }), // Only persist user details, not access token
    }
  )
);
