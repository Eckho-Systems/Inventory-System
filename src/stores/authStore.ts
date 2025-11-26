import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { userService } from '../services';
import { LoginCredentials, User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const user = await userService.authenticate(credentials);
          
          if (user) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isInitialized: true,
            });
            return true;
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Invalid username or PIN',
              isInitialized: true,
            });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Login failed. Please try again.',
            isInitialized: true,
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          isInitialized: true,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const { user } = get();
        
        if (user) {
          // Verify user still exists in database
          try {
            const currentUser = await userService.findById(user.id);
            if (!currentUser || !currentUser.isActive) {
              // User no longer exists or is inactive
              get().logout();
            } else {
              // Update user data in case of changes
              set({ user: currentUser, isInitialized: true });
            }
          } catch (error) {
            console.error('Auth check error:', error);
            get().logout();
          }
        }
      },

      initializeAuth: async () => {
        const { user, isInitialized } = get();
        
        if (!isInitialized) {
          set({ isLoading: true });
          
          if (user) {
            try {
              // Verify stored user still exists and is active
              const currentUser = await userService.findById(user.id);
              if (currentUser && currentUser.isActive) {
                set({ 
                  user: currentUser, 
                  isAuthenticated: true, 
                  isLoading: false,
                  isInitialized: true 
                });
              } else {
                // User no longer valid, clear auth
                get().logout();
              }
            } catch (error) {
              console.error('Auth initialization error:', error);
              get().logout();
            }
          } else {
            set({ isLoading: false, isInitialized: true });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized
      }),
    }
  )
);

// Helper hooks
export const useAuth = () => {
  const auth = useAuthStore();
  
  return {
    ...auth,
    isLoggedIn: auth.isAuthenticated && !!auth.user,
    userRole: auth.user?.role,
    userName: auth.user?.name,
    can: (action: string) => {
      if (!auth.user) return false;
      return userService.canPerformAction(auth.user.role, action);
    },
  };
};

export const useRequireAuth = () => {
  const auth = useAuth();
  
  if (!auth.isAuthenticated || !auth.user) {
    throw new Error('User not authenticated');
  }
  
  return auth;
};
