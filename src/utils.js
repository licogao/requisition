import { STATUS_STEPS } from './constants';

// ... (上方原有的日期處理、CSV解析函式保持不變，不用動) ...
/**
 * 將 ISO 日期字串 (2023-12-25) 轉為民國格式 (112-12/25)
 */
export const isoToMinguo = (isoDateStr) => {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  return `${parseInt(parts[0]) - 1911}-${parts[1]}/${parts[2]}`; 
};

/**
 * 將民國字串 (1120101 或 112-01-01) 轉回 ISO 格式
 */
export const minguoToIso = (minguoStr) => {
  if (!minguoStr) return '';
  let cleanStr = minguoStr.replace(/[^\d]/g, '');
  
  if (cleanStr.length === 6 || cleanStr.length === 7) {
    const yLen = cleanStr.length === 7 ? 3 : 2;
    const y = parseInt(cleanStr.substring(0, yLen)) + 1911;
    const m = cleanStr.substring(yLen, yLen + 2);
    const d = cleanStr.substring(yLen + 2);
    return `${y}-${m}-${d}`;
  }
  
  const parts = minguoStr.split(/[-/.]/);
  if (parts.length === 3) {
      const y = parseInt(parts[0]) + 1911;
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
  }
  return '';
};

/**
 * 格式化完整的日期時間 (YYYY/MM/DD HH:mm)
 */
export const formatDate = (isoString) => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    const y = date.getFullYear() - 1911;
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${h}:${min}`;
  } catch (e) { return '-'; }
};

/**
 * Date 物件轉民國日期 (YYYY/MM/DD)
 */
export const toMinguoDate = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '-';
  const y = dateObj.getFullYear() - 1911;
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

/**
 * 產生月份篩選清單 (最近 12 個月)
 */
export const generateMonthList = () => {
  const months = [];
  const today = new Date();
  for (let i = -12; i <= 1; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear() - 1911}年${d.getMonth() + 1}月`;
    const labelFull = `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ value, label });
  }
  return months.reverse();
};

/**
 * 解析 CSV 單行資料 (包含處理引號與 BOM)
 */
export const parseCSVLine = (line) => {
  const cleanLine = line.replace(/^\uFEFF/, '');
  const result = [];
  let start = 0;
  let inQuotes = false;
  
  for (let i = 0; i < cleanLine.length; i++) {
    if (cleanLine[i] === '"') {
      inQuotes = !inQuotes;
    } else if (cleanLine[i] === ',' && !inQuotes) {
      let field = cleanLine.substring(start, i);
      if (field.startsWith('"') && field.endsWith('"')) {
          field = field.slice(1, -1).replace(/""/g, '"');
      }
      result.push(field);
      start = i + 1;
    }
  }
  
  let field = cleanLine.substring(start);
  if (field.startsWith('"') && field.endsWith('"')) {
      field = field.slice(1, -1).replace(/""/g, '"');
  }
  result.push(field);
  return result;
};

/**
 * 取得操作人員顯示名稱
 */
export const getOperatorName = (user) => {
    if (!user) return '未知';
    if (user.isAnonymous) return '訪客';
    if (user.email) return user.email.split('@')[0];
    return '管理員';
};

/**
 * 產生 CSV 內容字串 (給人類閱讀的報表)
 */
export const generateCSV = (dataToExport) => {
    const headers = ['流水號', '原申請單日期', '是否速件', '申請日期', '申請單位', '申請人', '計畫補助', '廠商', '品項名稱', '數量', '單位', '單價', '小計', '領回人', '目前狀態', '目前狀態時間', '備註'];
    let csvRows = [];
    
    const escape = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
    };

    dataToExport.forEach(f => {
      const dateStr = f.createdAt?.toDate ? toMinguoDate(f.createdAt.toDate()) : '-';
      const appDateStr = isoToMinguo(f.applicationDate);
      const statusStr = STATUS_STEPS[f.status]?.label || f.status;
      const statusTimeStr = f.updatedAt?.toDate ? formatDate(f.updatedAt.toDate().toISOString()) : '-';
      
      if (f.items && f.items.length > 0) {
          f.items.forEach(item => {
              const row = [
                f.serialId, 
                appDateStr, 
                f.isUrgent?'是':'否', 
                dateStr, 
                f.unit, 
                f.applicant, 
                f.subsidy, 
                f.vendor || '', 
                item.subject, 
                item.quantity,
                item.measureUnit,
                item.unitPrice,
                item.subtotal,
                f.receiverName||'', 
                statusStr,
                statusTimeStr,
                f.globalRemark || ''
              ].map(escape).join(',');
              csvRows.push(row);
          });
      } else {
          const row = [
            f.serialId, 
            appDateStr, 
            f.isUrgent?'是':'否', 
            dateStr, 
            f.unit, 
            f.applicant, 
            f.subsidy, 
            f.vendor || '', 
            f.subject, 
            '1', '式', f.totalPrice, f.totalPrice,
            f.receiverName||'', 
            statusStr,
            statusTimeStr,
            f.globalRemark || ''
          ].map(escape).join(',');
          csvRows.push(row);
      }
    });
    
    return '\uFEFF' + [headers.map(escape).join(','), ...csvRows].join('\n');
};

/**
 * 觸發瀏覽器下載 CSV
 */
export const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); 
    link.href = url; 
    link.download = filename; 
    link.click();
};

// ==========================================
// ★ 新增功能：完整備份與還原 (JSON 格式)
// ==========================================

export const generateBackupJSON = (dataToExport) => {
    return JSON.stringify(dataToExport, null, 2);
};

export const downloadJSON = (content, filename) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); 
    link.href = url; 
    link.download = filename; 
    link.click();
};

/**
 * [匯入處理] 智慧合併邏輯 (修正版)
 * 修正重點：將欄位名稱 'history' 改回系統標準的 'logs'，確保 UI 能正確顯示。
 */
export const processBackupImport = (currentDBData, importedFileData) => {
    const currentDataMap = new Map(currentDBData.map(item => [item.id, item]));
    const mergedResults = [];
    
    // 使用 ISO String 以符合 App.js 裡的 logs 格式
    const timestampStr = new Date().toISOString(); 

    importedFileData.forEach(importItem => {
        // 準備新的歷程紀錄 (Log)
        // ★ 關鍵修正：這裡的欄位名稱必須跟 App.js 裡的一模一樣 (status, timestamp, note, operator)
        const importLogRecord = {
            status: importItem.status, 
            timestamp: timestampStr, 
            note: "系統批次匯入 (還原)", // 這是您想看的那一行
            operator: "系統"
        };

        // 檢查是否已存在
        if (currentDataMap.has(importItem.id)) {
            // ★ 修正：讀取 'logs' 而不是 'history'
            const newLogs = [
                ...(importItem.logs || []), // 保留 JSON 檔裡的舊 logs
                importLogRecord // 加上新的一行
            ];

            mergedResults.push({
                ...importItem,
                logs: newLogs // ★ 修正：寫入 'logs'
            });

            currentDataMap.delete(importItem.id);
        } else {
            // 全新資料
            const newLogs = [
                ...(importItem.logs || []),
                importLogRecord
            ];

            mergedResults.push({
                ...importItem,
                logs: newLogs
            });
        }
    });

    // 保留公司有、但匯入檔沒有的資料
    currentDataMap.forEach(existingItem => {
        mergedResults.push(existingItem);
    });

    return mergedResults;
};