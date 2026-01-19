import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut 
} from 'firebase/auth';
import { auth, db, appId } from '../firebase';
import { logAction, LOG_TYPES } from '../logger';
import { DEFAULT_DOMAIN } from '../constants';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const email = `${username}${DEFAULT_DOMAIN}`;
      await signInWithEmailAndPassword(auth, email, password);
      logAction(db, appId, auth.currentUser, LOG_TYPES.LOGIN, `使用者 ${username} 登入成功`);
    } catch (err) {
      console.error("Login failed:", err);
      setError('登入失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymous = async () => {
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(auth);
      logAction(db, appId, auth.currentUser, LOG_TYPES.LOGIN, '訪客登入');
    } catch (err) {
      console.error("Anon login failed:", err);
      setError('訪客登入失敗');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (window.confirm('確定要登出系統嗎？')) {
      const currentUser = user;
      try {
        await signOut(auth);
        logAction(db, appId, currentUser, LOG_TYPES.LOGOUT, '使用者登出');
      } catch (err) {
        console.error(err);
        alert('登出失敗');
      }
    }
  };

  return { user, loading, error, login, loginAnonymous, logout };
};