import { addDoc, collection } from 'firebase/firestore';

// 定義日誌類型常數 (對應前端 LogViewerModal 的圖示設定)
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
 * 取得操作人員顯示名稱 (內建於 logger 以減少依賴)
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
  // 如果沒有 user (例如尚未登入的錯誤)，視情況處理
  if (!db || !appId) return;

  try {
    const operator = getLoggerOperatorName(user);
    
    // 準備寫入的資料物件
    const logData = {
      action: action || 'DEFAULT', // 對應 LogViewerModal 的 TYPE_CONFIG
      detail: detail || '',        // 詳細說明
      user: operator,              // 操作者名稱
      uid: user?.uid || 'guest',   // 操作者 UID
      timestamp: new Date().toISOString(), // 使用 ISO 字串，確保前端顯示時間不會出錯
      userAgent: navigator.userAgent       // 除錯用資訊
    };

    // ★★★ 關鍵修正：寫入到 'public/data/logs'，這是新版日誌視窗讀取的位置 ★★★
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), logData);
    
    // 開發模式下可以在 Console 顯示，方便 debug
    console.log(`[System Log] ${operator} | ${action} | ${detail}`);
    
  } catch (error) {
    // 日誌記錄失敗不應該卡死主程式，只印出錯誤
    console.error("日誌寫入失敗:", error);
  }
};