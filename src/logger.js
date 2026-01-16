// src/logger.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getOperatorName } from './utils'; // 複用你現有的工具來取得人名

// 定義動作類型常數 (方便統一管理，避免打錯字)
export const LOG_TYPES = {
  LOGIN: '登入',
  LOGOUT: '登出',
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '刪除',
  STATUS_CHANGE: '狀態更新',
  EXPORT: '匯出',
  IMPORT: '匯入',
  BATCH_DELETE: '批量刪除'
};

/**
 * 系統日誌記錄函式
 * @param {Object} db - Firestore 實例
 * @param {string} appId - 專案 ID
 * @param {Object} user - Firebase User 物件 (用來抓是誰操作)
 * @param {string} type - 動作類型 (建議使用 LOG_TYPES)
 * @param {string} details - 詳細內容 (例如：流水號、修改了什麼)
 */
export const logAction = async (db, appId, user, type, details) => {
  // 如果沒有 user (例如尚未登入的錯誤)，視情況處理，這裡預設不記錄或記為未知
  if (!user && type !== LOG_TYPES.LOGIN) return;

  try {
    const operator = getOperatorName(user);
    
    // 寫入到 system_logs 集合 (與 school_forms 同層級)
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'system_logs'), {
      timestamp: serverTimestamp(), // 伺服器時間
      operator: operator,           // 操作者名稱
      uid: user?.uid || 'guest',    // 操作者 UID (方便追蹤唯一性)
      type: type,                   // 動作類型
      details: details,             // 動作描述
      userAgent: navigator.userAgent // (選填) 記錄是手機還是電腦，除錯好用
    });
    
    // 開發模式下可以在 Console 顯示，方便你看
    console.log(`[System Log] ${operator} | ${type} | ${details}`);
    
  } catch (error) {
    // 日誌記錄失敗不應該卡死主程式，所以我們只印出錯誤，不 throw error
    console.error("日誌寫入失敗:", error);
  }
};