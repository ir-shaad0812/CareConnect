// ============================================
// USE USER PROFILE HOOK
// Fetch and update user profile
// ============================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { userService } from '../services';
import { authService } from '@/modules/auth';
import type { User, ProfileUpdateData } from '@/modules/user/types';

interface UseUserProfileReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<string | null>;
  removeAvatar: () => Promise<boolean>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getProfile();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        authService.updateStoredUser(response.data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.updateProfile(data);
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        authService.updateStoredUser(response.data.user);

        // Notify other components (e.g., Navbar)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('userUpdated'));
        }

        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.uploadAvatar(file);
      if (response.success && response.data?.avatarUrl) {
        // Update local state
        const avatarUrl = response.data.avatarUrl;
        setUser((prev: User | null) => (prev ? { ...prev, avatar: avatarUrl } : null));

        // Update stored user
        const stored = authService.getCurrentUser();
        if (stored) {
          authService.updateStoredUser({ ...stored, avatar: avatarUrl });
        }

        // Notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('userUpdated'));
        }

        return avatarUrl;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeAvatar = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.removeAvatar();
      if (response.success) {
        setUser((prev: User | null) => {
          if (!prev) {
            return null;
          }

          const nextUser: User = { ...prev };
          delete nextUser.avatar;
          return nextUser;
        });

        const stored = authService.getCurrentUser();
        if (stored) {
          const storedWithoutAvatar: User = { ...stored };
          delete storedWithoutAvatar.avatar;
          authService.updateStoredUser(storedWithoutAvatar);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('userUpdated'));
        }

        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!user) {
      fetchProfile();
    }
  }, [fetchProfile, user]);

  return {
    user,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  };
}
