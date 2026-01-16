import { STATUS_STEPS } from './constants';

export const isoToMinguo = (isoDateStr) => {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  return `${parseInt(parts[0]) - 1911}-${parts[1]}/${parts[2]}`; 
};

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
  // 處理 114/01/01 或 114-01-01
  const parts = minguoStr.split(/[-/.]/);
  if (parts.length === 3) {
      const y = parseInt(parts[0]) + 1911;
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
  }
  return '';
};

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

export const toMinguoDate = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '-';
  const y = dateObj.getFullYear() - 1911;
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

export const generateMonthList = () => {
  const months = [];
  const today = new Date();
  for (let i = -12; i <= 1; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear() - 1911}年${d.getMonth() + 1}月`;
    months.push({ value, label });
  }
  return months.reverse();
};

export const parseCSVLine = (line) => {
  const result = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      let field = line.substring(start, i);
      if (field.startsWith('"') && field.endsWith('"')) {
          field = field.slice(1, -1).replace(/""/g, '"');
      }
      result.push(field);
      start = i + 1;
    }
  }
  let field = line.substring(start);
  if (field.startsWith('"') && field.endsWith('"')) {
      field = field.slice(1, -1).replace(/""/g, '"');
  }
  result.push(field);
  return result;
};

export const getOperatorName = (user) => {
    if (!user) return '未知';
    if (user.isAnonymous) return '訪客';
    if (user.email) return user.email.split('@')[0];
    return '管理員';
};

export const generateCSV = (dataToExport) => {
    const headers = ['流水號', '原申請單日期', '是否速件', '申請日期', '申請單位', '申請人', '計畫補助', '廠商', '品項名稱', '數量', '單位', '單價', '小計', '領回人', '目前狀態', '目前狀態時間', '備註'];
    let csvRows = [];
    
    dataToExport.forEach(f => {
      const dateStr = f.createdAt?.toDate ? toMinguoDate(f.createdAt.toDate()) : '-';
      const appDateStr = isoToMinguo(f.applicationDate);
      const statusStr = STATUS_STEPS[f.status]?.label || f.status;
      const statusTimeStr = f.updatedAt?.toDate ? formatDate(f.updatedAt.toDate().toISOString()) : '-';
      
      if (f.items && f.items.length > 0) {
          f.items.forEach(item => {
              csvRows.push([
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
              ].map(v => `"${String(v||'').replace(/"/g, '""')}"`).join(','));
          });
      } else {
          csvRows.push([
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
          ].map(v => `"${String(v||'').replace(/"/g, '""')}"`).join(','));
      }
    });
    
    return '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
};

export const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); 
    link.href = url; 
    link.download = filename; 
    link.click();
};