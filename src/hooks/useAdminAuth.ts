import { useState, useEffect, useCallback } from 'react';

const ADMIN_SESSION_KEY = 'albuhasson_admin_auth_v1';
const VALID_USERNAME = 'saad';
const VALID_PASSWORD = '33740';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const login = useCallback((username: string, pass: string): { success: boolean; error?: string } => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (trimmedUser === VALID_USERNAME && trimmedPass === VALID_PASSWORD) {
      setIsAdmin(true);
      try {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch (err) {
        console.error('Failed to set admin session', err);
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.'
    };
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (err) {
      console.error('Failed to remove admin session', err);
    }
  }, []);

  return {
    isAdmin,
    login,
    logout,
    adminUsername: VALID_USERNAME
  };
}
