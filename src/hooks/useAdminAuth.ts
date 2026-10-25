import { useState, useEffect, useCallback } from 'react';
import { auth, signInWithGoogle, logOutUser } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const ADMIN_SESSION_KEY = 'albuhasson_admin_auth_v1';
const VALID_USERNAME = 'saad';
const VALID_PASSWORD = '33740';
const ADMIN_EMAILS = ['buainainsm@gmail.com'];

export function useAdminAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPasscodeAdmin, setIsPasscodeAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Admin status: either logged in with Google (verified email) or via passcode
  const isGoogleAdmin = Boolean(currentUser && currentUser.emailVerified);
  const isSuperAdmin = Boolean(
    currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase())
  );
  const isAdmin = isPasscodeAdmin || isGoogleAdmin;

  const loginWithPasscode = useCallback((username: string, pass: string): { success: boolean; error?: string } => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (trimmedUser === VALID_USERNAME && trimmedPass === VALID_PASSWORD) {
      setIsPasscodeAdmin(true);
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

  const loginWithGoogleAuth = useCallback(async () => {
    try {
      const user = await signInWithGoogle();
      return { success: true, user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    setIsPasscodeAdmin(false);
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (err) {
      console.error('Failed to remove admin session', err);
    }
    try {
      await logOutUser();
    } catch (err) {
      console.error('Failed to log out from Firebase', err);
    }
  }, []);

  return {
    isAdmin,
    isSuperAdmin,
    isGoogleAdmin,
    currentUser,
    login: loginWithPasscode,
    loginWithGoogle: loginWithGoogleAuth,
    logout,
    adminUsername: VALID_USERNAME
  };
}
