import { useState } from 'react';
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { STATUS_STEPS } from '../constants';
import { isoToMinguo, generateCSV, downloadCSV, generateBackupJSON, downloadJSON, processBackupImport } from '../utils';
import { logAction, LOG_TYPES } from '../logger';

export const useDataTransfer = ({ db, appId, user, forms, setForms, setModal }) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showExportFormatSelect, setShowExportFormatSelect] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDebugClearOpen, setIsDebugClearOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [isCsvViewerOpen, setIsCsvViewerOpen] = useState(false);

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportMode, setExportMode] = useState('all');

  const openAlert = (title, message, type = 'info') => {
    setModal({ isOpen: true, type: 'alert', title, message, alertType: type });
  };

  const handleDeleteMonth = (monthKey, formsToDelete) => {
    setModal({
      isOpen: true, 
      type: 'confirm', 
      alertType: 'danger', 
      title: '⚠️ 刪除確認', 
      message: `確定要刪除「${monthKey}」的 ${formsToDelete.length} 筆資料嗎？\n\n(系統將會同步清理該月份的系統操作日誌，刪除後無法復原)`,
      onConfirm: async () => {
        try {
          let deleteCount = 0;
          for (const docData of formsToDelete) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', docData.id));
            deleteCount++;
          }

          const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
          const logsQuery = query(
             logsRef,
             where('timestamp', '>=', monthKey),
             where('timestamp', '<', monthKey + '\uf8ff')
          );
          const logsSnapshot = await getDocs(logsQuery);
          let deletedLogsCount = 0;
          for (const logDoc of logsSnapshot.docs) {
             await deleteDoc(logDoc.ref);
             deletedLogsCount++;
          }

          setForms(prev => prev.filter(f => !formsToDelete.some(d => d.id === f.id)));
          
          logAction(db, appId, user, LOG_TYPES.BATCH_DELETE, `批量封存月份 [${monthKey}]，共刪除 ${deleteCount} 筆單據與 ${deletedLogsCount} 筆系統日誌`);
          
          setTimeout(() => openAlert('刪除成功', `已刪除 ${monthKey} 的所有選定資料\n(含 ${deletedLogsCount} 筆系統日誌被自動清理)。`), 500);
        } catch (err) {
          console.error("Delete process error:", err);
          setTimeout(() => openAlert('刪除失敗', '流程發生錯誤，請稍後再試。', 'danger'), 500);
        }
      }
    });
  };

  const handleExportClick = () => setIsExportModalOpen(true);
  const handleCloseExportModal = () => { 
    setIsExportModalOpen(false); 
    setExportStartDate(''); 
    setExportEndDate(''); 
  };

  const getFilteredExportData = () => {
    let dataToExport = forms; 
    if (exportMode === 'date') {
        if (!exportStartDate || !exportEndDate) return [];
        dataToExport = forms.filter(form => {
            if (!form.serialId) return false;
            const parts = form.serialId.replace(/[()]/g, '').split('-');
            if (parts.length < 2) return false; 
            const createdDate = form.createdAt?.toDate ? form.createdAt.toDate() : new Date();
            const formDateStr = `${createdDate.getFullYear()}-${parts[0]}-${parts[1]}`;
            return formDateStr >= exportStartDate && formDateStr <= exportEndDate;
        });
    } else if (exportMode === 'completed') {
        dataToExport = forms.filter(form => STATUS_STEPS[form.status]?.phase === 3 || STATUS_STEPS[form.status]?.phase === 4);
    }
    return dataToExport.sort((a, b) => (b.serialId || '').localeCompare(a.serialId || ''));
  };

  const handleConfirmExport = () => {
    const dataToExport = getFilteredExportData();
    if (exportMode === 'date' && (!exportStartDate || !exportEndDate)) { 
        openAlert('匯出失敗', '請選擇完整的起始與結束日期。', 'danger'); 
        return; 
    }
    if (dataToExport.length === 0) { 
        openAlert('匯出失敗', '選擇的範圍內沒有資料。', 'danger'); 
        return; 
    }
    setShowExportFormatSelect(true);
  };

  const executeExport = (format) => {
    const dataToExport = getFilteredExportData();
    const dateRangeStr = exportMode === 'date' 
        ? `${isoToMinguo(exportStartDate).replace(/-/g, '')}-${isoToMinguo(exportEndDate).replace(/-/g, '')}` 
        : (exportMode === 'completed' ? '結案存檔' : '全部');
        
    if (format === 'json') {
        downloadJSON(generateBackupJSON(dataToExport), `系統備份_${dateRangeStr}.json`);
        logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出系統備份(JSON)：模式 [${exportMode}]，共 ${dataToExport.length} 筆`);
    } else {
        downloadCSV(generateCSV(dataToExport), `申請單報表_${dateRangeStr}.csv`);
        logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出報表(CSV)：模式 [${exportMode}]，共 ${dataToExport.length} 筆`);
    }
    setShowExportFormatSelect(false); 
    handleCloseExportModal();
  };

  const handleExportMonth = (monthKey, monthData, format) => {
    const dateRangeStr = monthKey.replace('-', '年') + '月';
    if (format === 'json') {
        downloadJSON(generateBackupJSON(monthData), `系統備份_${dateRangeStr}.json`);
        logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出單月備份(JSON)：[${monthKey}]，共 ${monthData.length} 筆`);
    } else {
        downloadCSV(generateCSV(monthData), `申請單報表_${dateRangeStr}.csv`);
        logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出單月報表(CSV)：[${monthKey}]，共 ${monthData.length} 筆`);
    }
  };

  const handleImportFile = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
        openAlert('格式不支援', '系統目前僅開放 JSON 備份檔匯入。', 'warning');
        e.target.value = ''; 
        return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
          const importedData = JSON.parse(content);
          if (!Array.isArray(importedData)) throw new Error("無效的備份資料");
          
          setModal({
              isOpen: true, 
              type: 'confirm', 
              title: '系統備份匯入', 
              message: `偵測到 JSON 備份檔，包含 ${importedData.length} 筆資料。\n確定要匯入嗎？`,
              onConfirm: async () => {
                  try {
                      const mergedData = processBackupImport(forms, importedData);
                      const batch = writeBatch(db);
                      let count = 0;
                      mergedData.forEach(item => { 
                          if (item.id) { 
                              batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', item.id), item, { merge: true }); 
                              count++; 
                          }
                      });
                      await batch.commit();
                      logAction(db, appId, user, LOG_TYPES.IMPORT, `JSON 備份匯入成功：更新 ${count} 筆資料`);
                      openAlert('匯入成功', `成功還原/更新 ${count} 筆資料 (含完整歷程)。`);
                  } catch (err) { 
                      console.error("JSON Import Error:", err); 
                      openAlert('匯入錯誤', '寫入資料庫時發生錯誤。', 'danger'); 
                  }
              }
          });
      } catch (error) { 
          openAlert('格式錯誤', '無法解析 JSON 檔案。', 'danger'); 
      }
      e.target.value = ''; 
    };
    reader.readAsText(file); 
    e.target.value = '';
  };

  const handleManageCompleted = () => setIsManageModalOpen(true);
  const handleDebugClear = () => setIsDebugClearOpen(true);

  return {
    isExportModalOpen, setIsExportModalOpen,
    showExportFormatSelect, setShowExportFormatSelect,
    isManageModalOpen, setIsManageModalOpen,
    isDebugClearOpen, setIsDebugClearOpen,
    isLogViewerOpen, setIsLogViewerOpen,
    isCsvViewerOpen, setIsCsvViewerOpen,
    exportStartDate, setExportStartDate,
    exportEndDate, setExportEndDate,
    exportMode, setExportMode,
    handleDeleteMonth, handleExportClick, handleCloseExportModal,
    handleConfirmExport, executeExport, handleExportMonth,
    handleImportFile, handleManageCompleted, handleDebugClear, openAlert
  };
};