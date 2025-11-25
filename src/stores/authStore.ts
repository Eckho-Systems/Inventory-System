import { create } from 'zustand';
import { userService } from '../services';
import { LoginCredentials, User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

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
            });
            return true;
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Invalid username or PIN',
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
              set({ user: currentUser });
            }
          } catch (error) {
            console.error('Auth check error:', error);
            get().logout();
          }
        }
      },
    })
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
