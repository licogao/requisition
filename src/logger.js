import { addDoc, collection } from 'firebase/firestore';

// 定義日誌類型常數
export const LOG_TYPES = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  BATCH_DELETE: 'BATCH_DELETE'
};

/**
 * 取得操作人員顯示名稱
 */
const getLoggerOperatorName = (user) => {
    if (!user) return '未知用戶';
    if (user.isAnonymous) return '訪客';
    if (user.email) return user.email.split('@')[0];
    return '管理員';
};

/**
 * 系統日誌記錄函式
 * @param {Object} db - Firestore 實例
 * @param {string} appId - 專案 ID
 * @param {Object} user - Firebase User 物件
 * @param {string} action - 動作類型 (請使用 LOG_TYPES)
 * @param {string} detail - 詳細內容
 */
export const logAction = async (db, appId, user, action, detail) => {
  if (!db || !appId) return;

  try {
    const operator = getLoggerOperatorName(user);
    
    const logData = {
      action: action || 'DEFAULT',
      detail: detail || '',
      user: operator,
      uid: user?.uid || 'guest',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // 寫入到 public/data/logs 集合
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), logData);
    
    // 開發模式下顯示於 Console
    console.log(`[System Log] ${operator} | ${action} | ${detail}`);
    
  } catch (error) {
    console.error("日誌寫入失敗:", error);
  }
};