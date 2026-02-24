import { STATUS_STEPS } from './constants';

export const isoToMinguo = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return `${date.getFullYear() - 1911}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
};

export const generateMonthList = () => {
  const list = ['all'];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return list;
};

export const getOperatorName = (user) => {
  if (!user) return '未知使用者';
  return user.displayName || user.email?.split('@')[0] || '系統管理員';
};

// 加入字串過濾，避免換行與逗號破壞 CSV 格式
const safeString = (val) => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\r\n]+/g, ' ') 
    .replace(/,/g, '，');      
};

// 將資料轉換為 CSV 格式字串 (加上 BOM 避免 Excel 亂碼)
export const generateCSV = (data) => {
  const headers = [
    '流水號', '申請單日期', '建立時間', '申請單位', '申請人', 
    '計畫', '廠商', '品項名稱', '數量', '單位', '單價', '小計', 
    '總金額', '目前狀態', '領回人', '領回時間', '備註'
  ];
  
  const csvRows = [];

  data.forEach(item => {
    const serial = safeString(item.serialId);
    const appDate = safeString(isoToMinguo(item.applicationDate));
    const createTime = safeString(item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('zh-TW') : '');
    const unit = safeString(item.unit);
    const applicant = safeString(item.applicant);
    const subsidy = safeString(item.subsidy);
    const vendor = safeString(item.vendor);
    const total = item.totalPrice || 0;
    const status = safeString(STATUS_STEPS[item.status]?.label || item.status);
    const receiver = safeString(item.receiverName);
    const remark = safeString(item.globalRemark);
    
    // 尋找領回時間
    let pickupTimeStr = '';
    if (item.time_P1_RETURNED) {
        pickupTimeStr = new Date(item.time_P1_RETURNED).toLocaleString('zh-TW');
    } else if (item.logs) {
        const pickupLog = item.logs.find(log => log.status === 'P1_RETURNED' || (log.note && log.note.includes('領回')));
        if (pickupLog && pickupLog.timestamp) {
            pickupTimeStr = new Date(pickupLog.timestamp).toLocaleString('zh-TW');
        }
    }
    const pickupTime = safeString(pickupTimeStr);

    // 展開品項陣列為多行
    if (item.items && item.items.length > 0) {
        item.items.forEach(subItem => {
            csvRows.push([
                serial, appDate, createTime, unit, applicant,
                subsidy, vendor, safeString(subItem.subject), subItem.quantity || 0, safeString(subItem.measureUnit),
                subItem.unitPrice || 0, subItem.subtotal || 0, total, status, receiver, pickupTime, remark
            ].join(','));
        });
    } else {
        csvRows.push([
            serial, appDate, createTime, unit, applicant,
            subsidy, vendor, safeString(item.subject), 1, '式',
            total, total, total, status, receiver, pickupTime, remark
        ].join(','));
    }
  });

  const csvContent = [
    headers.join(','),
    ...csvRows
  ].join('\n');
  
  return '\uFEFF' + csvContent; 
};

export const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 將資料轉換為 JSON 格式 (處理 Firebase Timestamp)
export const generateBackupJSON = (data) => {
    const cleanData = data.map(item => {
        const newItem = { ...item };
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString();
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString();
        return newItem;
    });
    return JSON.stringify(cleanData, null, 2);
};

export const downloadJSON = (jsonContent, fileName) => {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 處理備份檔匯入的資料合併邏輯
export const processBackupImport = (existingData, importedData) => {
  const existingMap = new Map(existingData.map(item => [item.id, item]));
  
  importedData.forEach(item => {
      // 將 JSON 裡的字串日期還原為 Date 物件，確保寫入 Firestore 時能轉回時間戳記以維持排序
      const parsedItem = { ...item };
      if (typeof parsedItem.createdAt === 'string') parsedItem.createdAt = new Date(parsedItem.createdAt);
      if (typeof parsedItem.updatedAt === 'string') parsedItem.updatedAt = new Date(parsedItem.updatedAt);

      existingMap.set(parsedItem.id, { ...existingMap.get(parsedItem.id), ...parsedItem });
  });
  
  return Array.from(existingMap.values());
};