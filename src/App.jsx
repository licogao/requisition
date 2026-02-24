import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, addDoc, updateDoc, doc, query, deleteDoc, setDoc, writeBatch, getDocs, where, serverTimestamp, limit, orderBy 
} from 'firebase/firestore'; 
import { 
  Plus, Search, Calendar, Flame, Filter, Edit2, Upload, Download, LogOut, FileText, Clock, FolderCog, ShoppingCart, X, Loader2, Settings, Box, Wrench, Activity, FileJson, FileSpreadsheet, Cloud, CheckSquare, ArrowRight, RotateCcw, UserCheck, CheckCheck 
} from 'lucide-react';

import { db, appId } from './firebase'; 
import { STATUS_STEPS, DEFAULT_DOMAIN, REVERSE_STEPS } from './constants';
import { isoToMinguo, generateMonthList, getOperatorName, generateCSV, downloadCSV, generateBackupJSON, downloadJSON, processBackupImport } from './utils';
import { logAction, LOG_TYPES } from './logger'; 

import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useForms } from './hooks/useForms';

import LoginPage from './components/LoginPage';
import MinguoDateInput from './components/MinguoDateInput';
import SearchableSelect from './components/SearchableSelect';
import SettingsModal from './components/SettingsModal';
import ManageCompletedModal from './components/ManageCompletedModal';
import DebugClearModal from './components/DebugClearModal';
import ExportModal from './components/ExportModal';
import GlobalModal from './components/GlobalModal';
import FormRow from './components/FormRow';
import MobileFormCard from './components/MobileFormCard'; 
import LogViewerModal from './components/LogViewerModal'; 

import AppHeader from './components/AppHeader';
import FilterBar from './components/FilterBar';

const ADMIN_EMAILS = [`268${DEFAULT_DOMAIN}`]; 

export default function App() {
  const { user, loading: authLoading, error: authError, login: handleLogin, logout: handleLogout } = useAuth();
  const { unitOptions, projectOptions, vendorOptions, applicantOptions, checkAndSaveNewOptions } = useSettings(user);
  const { forms, setForms, loading: formsLoading } = useForms(user);

  // --- UI 狀態 ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [monthTabs] = useState(generateMonthList());
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- 篩選狀態 ---
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterVendor, setFilterVendor] = useState('all'); 
  const [filterStartDate, setFilterStartDate] = useState(''); 
  const [filterEndDate, setFilterEndDate] = useState('');     
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '' });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showExportFormatSelect, setShowExportFormatSelect] = useState(false); 
  const [isManageModalOpen, setIsManageModalOpen] = useState(false); 
  const [isDebugClearOpen, setIsDebugClearOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false); 

  // --- 匯出狀態 ---
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportMode, setExportMode] = useState('all');

  // --- 表單狀態 ---
  const [newUnit, setNewUnit] = useState('');
  const [newApplicant, setNewApplicant] = useState('');
  const [newSubsidy, setNewSubsidy] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newGlobalRemark, setNewGlobalRemark] = useState('');
  const [newApplicationDate, setNewApplicationDate] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [previewSerialId, setPreviewSerialId] = useState(''); 
  const [newItems, setNewItems] = useState([{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFormId, setEditingFormId] = useState(null);
  const [isCustomSubsidy, setIsCustomSubsidy] = useState(false);
  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isCustomApplicant, setIsCustomApplicant] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false); 

  const totalAmount = newItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0);

  useEffect(() => {
    if (isSettingsOpen || isFormOpen || isExportModalOpen || modal.isOpen || isManageModalOpen || isDebugClearOpen || isLogViewerOpen || showExportFormatSelect) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSettingsOpen, isFormOpen, isExportModalOpen, modal.isOpen, isManageModalOpen, isDebugClearOpen, isLogViewerOpen, showExportFormatSelect]);

  const availableApplicants = useMemo(() => {
    if (!applicantOptions) return [];
    if (newUnit && applicantOptions[newUnit]) {
        return applicantOptions[newUnit];
    }
    return [];
  }, [newUnit, applicantOptions]);

  const handleSelectOne = (id, checked) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
        setSelectedIds(new Set(filteredForms.map(f => f.id)));
    } else {
        setSelectedIds(new Set());
    }
  };

  const handleBatchAction = (actionType) => {
    if (selectedIds.size === 0) return;

    const targets = forms.filter(f => selectedIds.has(f.id));
    if (targets.length === 0) return;

    if (actionType === 'advance') {
        const hasAccountingReviewForms = targets.some(f => STATUS_STEPS[f.status]?.label === '第一輪：會計室審核中');
        
        if (hasAccountingReviewForms) {
            setModal({ 
                isOpen: true, 
                type: 'alert', 
                alertType: 'warning', 
                title: '操作受限', 
                message: '選取項目中包含「第一輪：會計室審核中」的單據。\n\n此階段必須填寫領回人才能進入下一步，無法使用批量推進。\n\n請改用「批量領回」功能。' 
            });
            return;
        }

        setModal({
            isOpen: true, type: 'action', title: `批量推進 (${targets.length} 筆)`, message: '將嘗試將選取的單據推進至下一階段。\n(已結案或不符合條件的單據將自動略過)',
            onConfirm: async ({ note }) => {
                await executeBatchUpdate(targets, 'advance', note);
            }
        });
    } else if (actionType === 'revert') {
        const validTargets = targets.filter(f => REVERSE_STEPS[f.status]);
        
        if (validTargets.length === 0) {
             setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '選取的單據皆位於初始階段，無法執行退回操作。' });
             return;
        }

        setModal({
            isOpen: true, type: 'action', title: `批量退回 (${validTargets.length} 筆)`, message: `將退回 ${validTargets.length} 筆單據。\n(已自動略過 ${targets.length - validTargets.length} 筆初始階段單據)\n\n請輸入退回原因`, showNoteInput: true, noteRequired: true, alertType: 'danger',
            onConfirm: async ({ note }) => {
                await executeBatchUpdate(validTargets, 'revert', note);
            }
        });
    } else if (actionType === 'receiver') {
        const validTargets = targets.filter(f => STATUS_STEPS[f.status]?.label === '第一輪：會計室審核中');
        
        if (validTargets.length === 0) {
             setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '批量領回功能僅適用於「第一輪：會計室審核中」的單據。\n\n請重新檢查您勾選的項目。' });
             return;
        }

        setModal({
            isOpen: true, type: 'action', title: `批量登錄領回 (${validTargets.length} 筆)`, message: `將對 ${validTargets.length} 筆符合資格的單據登錄領回人，並自動推進至下一流程。\n\n(已自動略過 ${targets.length - validTargets.length} 筆狀態不符的單據)`, showPickupInput: true,
            onConfirm: async ({ pickupName }) => {
                await executeBatchUpdate(validTargets, 'receiver', null, pickupName);
            }
        });
    } else if (actionType === 'direct_complete') {
        const validTargets = targets.filter(f => STATUS_STEPS[f.status]?.phase === 1 && f.status !== 'P2_RETURNED');
        
        if (validTargets.length === 0) {
            setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '此功能僅適用於「第一輪」的單據。\n\n(只有第一輪單據可以直接跳過中間流程結案，且不包含已領回的單據)' });
            return;
        }

        setModal({
            isOpen: true, type: 'action', title: `批量直接結案 (${validTargets.length} 筆)`, message: `⚠️ 即將對 ${validTargets.length} 筆第一輪單據執行「上下核章直接結案」。\n\n這些單據將跳過中間流程，直接變更為「已結案」。\n(已自動略過 ${targets.length - validTargets.length} 筆非第一輪或不符合條件的單據)`,
            onConfirm: async ({ note }) => {
                await executeBatchUpdate(validTargets, 'direct_complete', note);
            }
        });
    }
  };

  const executeBatchUpdate = async (targets, type, note, pickupName) => {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();
    let successCount = 0;
    let skipCount = 0;

    targets.forEach(form => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id);
        let updateData = null;

        if (type === 'advance') {
            const step = STATUS_STEPS[form.status];
            if (step && step.nextAction) {
                const keys = Object.keys(STATUS_STEPS);
                const idx = keys.indexOf(form.status);
                const targetStatus = (idx !== -1 && idx < keys.length - 1) ? keys[idx + 1] : null;
                
                if (targetStatus) {
                    updateData = {
                        status: targetStatus,
                        logs: [...(form.logs || []), { status: targetStatus, timestamp, note: note ? `${STATUS_STEPS[targetStatus].label} [批量: ${note}]` : STATUS_STEPS[targetStatus].label, operator: getOperatorName(user) }],
                        updatedAt: serverTimestamp(),
                        [`time_${targetStatus}`]: timestamp
                    };
                }
            }
        } else if (type === 'revert') {
            const prevStatusKey = REVERSE_STEPS[form.status];
            if (prevStatusKey) {
                updateData = {
                    status: prevStatusKey,
                    logs: [...(form.logs || []), { status: prevStatusKey, timestamp, note: `退回至：${STATUS_STEPS[prevStatusKey].label} [批量原因: ${note}]`, operator: getOperatorName(user) }],
                    updatedAt: serverTimestamp()
                };
            }
        } else if (type === 'receiver') {
            if (pickupName) {
                const keys = Object.keys(STATUS_STEPS);
                const idx = keys.indexOf(form.status);
                const targetStatus = (idx !== -1 && idx < keys.length - 1) ? keys[idx + 1] : null;

                if (targetStatus) {
                    updateData = {
                        receiverName: pickupName,
                        status: targetStatus,
                        logs: [...(form.logs || []), { 
                            status: targetStatus, 
                            timestamp, 
                            note: `${STATUS_STEPS[targetStatus].label} [批量領回: ${pickupName}]`,
                            operator: getOperatorName(user) 
                        }],
                        updatedAt: serverTimestamp(),
                        [`time_${targetStatus}`]: timestamp
                    };
                }
            }
        } else if (type === 'direct_complete') {
            const targetStatus = 'COMPLETED'; 
            updateData = {
                status: targetStatus,
                logs: [...(form.logs || []), { 
                    status: targetStatus, 
                    timestamp, 
                    note: `上下核章直接結案 [批量操作${note ? ': ' + note : ''}]`, 
                    operator: getOperatorName(user) 
                }],
                updatedAt: serverTimestamp(),
                [`time_${targetStatus}`]: timestamp
            };
        }

        if (updateData) {
            batch.update(ref, updateData);
            successCount++;
        } else {
            skipCount++;
        }
    });

    if (successCount > 0) {
        await batch.commit();
        
        const logType = (type === 'advance' || type === 'revert' || type === 'receiver' || type === 'direct_complete') 
            ? LOG_TYPES.STATUS_CHANGE 
            : LOG_TYPES.UPDATE;

        logAction(db, appId, user, logType, `批量操作 (${type}): 成功 ${successCount} 筆, 略過 ${skipCount} 筆`);
        
        setModal({ isOpen: true, title: '處理完成', message: `成功更新: ${successCount} 筆\n自動略過: ${skipCount} 筆 (狀態不符或失敗)` });
    } else {
        setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無變更', message: '沒有符合條件的單據可供更新。' });
    }
  };

  const handleCloudSearch = async () => {
    if (!searchTerm.trim()) {
        setModal({ isOpen: true, type: 'alert', title: '請輸入關鍵字', message: '請輸入流水號（例如 11201-01）或廠商名稱以進行雲端搜尋。' });
        return;
    }

    setIsSearchingCloud(true);
    try {
        const qSerial = query(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'), where('serialId', '==', searchTerm.trim()));
        const qSerialWithBrackets = query(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'), where('serialId', '==', `(${searchTerm.trim()})`));
        const [snap1, snap2] = await Promise.all([getDocs(qSerial), getDocs(qSerialWithBrackets)]);
        const foundDocs = [];
        snap1.forEach(d => foundDocs.push({id: d.id, ...d.data()}));
        snap2.forEach(d => { if (!foundDocs.some(f => f.id === d.id)) foundDocs.push({id: d.id, ...d.data()}); });

        if (foundDocs.length > 0) {
            setForms(prev => {
                const combined = [...prev];
                foundDocs.forEach(newForm => { if (!combined.some(f => f.id === newForm.id)) combined.push(newForm); });
                combined.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0; const timeB = b.createdAt?.seconds || 0;
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.serialId || '').localeCompare(a.serialId || '');
                });
                return combined;
            });
            setModal({ isOpen: true, title: '搜尋完成', message: `從雲端資料庫找到了 ${foundDocs.length} 筆資料，已加入列表顯示。` });
            setFilterMonth('all'); 
        } else {
            setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '查無資料', message: '在雲端資料庫中找不到符合該流水號的資料。' });
        }
    } catch (err) {
        console.error("Cloud search error:", err);
        setModal({ isOpen: true, type: 'alert', alertType: 'danger', title: '搜尋失敗', message: '連接資料庫時發生錯誤。' });
    } finally {
        setIsSearchingCloud(false);
    }
  };

  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      // 確保勾選的項目不會被篩選器隱藏
      if (selectedIds.has(form.id)) return true;

      if (filterMonth !== 'all') {
        const d = form.createdAt?.toDate ? form.createdAt.toDate() : new Date();
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (m !== filterMonth) return false;
      }
      if (filterVendor !== 'all' && form.vendor !== filterVendor) return false;
      if (filterStartDate && filterEndDate) {
         const targetDate = form.applicationDate || (form.createdAt?.toDate ? form.createdAt.toDate().toISOString().split('T')[0] : '');
         if (targetDate < filterStartDate || targetDate > filterEndDate) return false;
      }
      if (showUrgentOnly && !form.isUrgent) return false;

      const s = searchTerm.toLowerCase();
      const match = !s || (
        (form.serialId && form.serialId.toLowerCase().includes(s)) ||
        (form.subject && form.subject.toLowerCase().includes(s)) ||
        (form.unit && form.unit.toLowerCase().includes(s)) ||
        (form.applicant && form.applicant.toLowerCase().includes(s)) ||
        (form.vendor && form.vendor.toLowerCase().includes(s)) ||
        (form.globalRemark && form.globalRemark.toLowerCase().includes(s))
      );
      if (!match) return false;
      
      if (filterPhase === 'phase1') return STATUS_STEPS[form.status]?.phase === 1 && form.status !== 'P1_RETURNED';
      if (filterPhase === 'phase2') return (STATUS_STEPS[form.status]?.phase === 2 || form.status === 'P1_RETURNED') && form.status !== 'COMPLETED';
      if (filterPhase === 'phase3') return STATUS_STEPS[form.status]?.phase === 3;
      
      return true;
    });
  }, [forms, searchTerm, filterPhase, filterMonth, showUrgentOnly, filterVendor, filterStartDate, filterEndDate, selectedIds]); 

  const generateSerialId = () => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePrefix = `${month}-${day}`;
    const todayForms = forms.filter(f => f.serialId && f.serialId.startsWith(`(${datePrefix}`));
    let maxSeq = 0;
    todayForms.forEach(f => {
      const parts = f.serialId.replace(/[()]/g, '').split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
    return `(${datePrefix}-${(maxSeq + 1).toString().padStart(2, '0')})`;
  };

  useEffect(() => {
    if (isFormOpen && !isEditMode) setPreviewSerialId(generateSerialId());
  }, [isFormOpen, forms, isEditMode]);

  // --- 表單處理事件 ---
  const handleAddItem = () => setNewItems([...newItems, { id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
  const handleRemoveItem = (index) => { if (newItems.length > 1) { const updated = [...newItems]; updated.splice(index, 1); setNewItems(updated); } };
  const handleItemChange = (index, field, value) => { const updated = [...newItems]; updated[index][field] = value; setNewItems(updated); };

  const resetForm = () => {
    setNewUnit(''); setNewApplicant(''); setNewSubsidy(''); setIsCustomSubsidy(false); setNewVendor(''); setIsCustomVendor(false); setNewGlobalRemark(''); setIsUrgent(false); setNewApplicationDate(''); 
    setNewItems([{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
    setIsEditMode(false); setEditingFormId(null); setPreviewSerialId('');
    setIsCustomUnit(false); setIsCustomApplicant(false); setIsCustomSubsidy(false); setIsCustomVendor(false);
  };

  const handleOpenCreate = () => { resetForm(); setIsEditMode(false); setIsFormOpen(true); };

  const handleEditClick = (form) => {
    setNewUnit(form.unit || ''); setNewApplicant(form.applicant || ''); setNewSubsidy(form.subsidy || ''); setNewVendor(form.vendor || ''); setNewGlobalRemark(form.globalRemark || ''); setNewApplicationDate(form.applicationDate || ''); setIsUrgent(form.isUrgent || false);
    const items = (form.items || []).map((item, idx) => ({ ...item, id: item.id || Date.now() + idx }));
    setNewItems(items.length > 0 ? items : [{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
    setPreviewSerialId(form.serialId); setEditingFormId(form.id); setIsEditMode(true);
    if (form.subsidy && !projectOptions.includes(form.subsidy) && form.subsidy !== '無計畫 (公務)') setIsCustomSubsidy(true); else setIsCustomSubsidy(false);
    if (form.vendor && !vendorOptions.includes(form.vendor)) setIsCustomVendor(true); else setIsCustomVendor(false);
    
    if (form.unit && !unitOptions.includes(form.unit)) setIsCustomUnit(true); else setIsCustomUnit(false);
    
    const applicantsInUnit = applicantOptions[form.unit] || [];
    if (form.applicant && !applicantsInUnit.includes(form.applicant)) setIsCustomApplicant(true); else setIsCustomApplicant(false);

    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; 
    if (!newUnit || newItems.some(i => !i.subject.trim() || !i.quantity || i.quantity <= 0 || i.unitPrice === '' || i.unitPrice === undefined)) { 
        setModal({ isOpen: true, type: 'alert', alertType: 'danger', title: '資料不完整', message: '請填寫單位、品項名稱、數量及單價' }); 
        return; 
    }
    if (!user) { setModal({ isOpen: true, type: 'alert', alertType: 'danger', title: '錯誤', message: '尚未連線到伺服器' }); return; }

    setIsSubmitting(true);
    try {
      checkAndSaveNewOptions({ 
          newUnit, 
          newApplicant, 
          newSubsidy, 
          newVendor 
      });

      const timestamp = new Date().toISOString();
      const mainSubject = newItems.map(i => i.subject).join('、');
      
      const formData = {
        unit: newUnit, applicant: newApplicant, isUrgent, globalRemark: newGlobalRemark, vendor: newVendor, applicationDate: newApplicationDate, 
        items: newItems.map(i => ({ subject: i.subject, quantity: parseInt(i.quantity) || 1, measureUnit: i.measureUnit || '個', unitPrice: parseInt(i.unitPrice) || 0, subtotal: (parseInt(i.quantity) || 0) * (parseInt(i.unitPrice) || 0) })),
        subject: mainSubject, totalPrice: totalAmount, subsidy: newSubsidy, updatedAt: serverTimestamp()
      };

      let logType, logDetail;
      if (isEditMode && editingFormId) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', editingFormId), formData);
         logType = LOG_TYPES.UPDATE; logDetail = `修改申請單：${previewSerialId} (金額: ${totalAmount})`;
      } else {
         const newSerialId = generateSerialId();
         formData.serialId = newSerialId; formData.status = 'P1_RECEIVED'; 
         formData.logs = [{ status: 'P1_RECEIVED', timestamp, note: '案件成立並完成收件', operator: getOperatorName(user) }];
         formData.time_P1_RECEIVED = timestamp; formData.createdAt = serverTimestamp();
         await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'), formData);
         logType = LOG_TYPES.CREATE; logDetail = `新增申請單：${newSerialId} (金額: ${totalAmount})`;
      }

      logAction(db, appId, user, logType, logDetail);

      if (isEditMode) { setIsFormOpen(false); setModal({ isOpen: true, title: '修改成功', message: `單號 ${previewSerialId} 資料已更新！` }); } 
      else { resetForm(); setModal({ isOpen: true, title: '新增成功', message: `申請單已立案！表格已清空。` }); }
      
    } catch (err) { 
      console.error("Submit error", err);
      setModal({ isOpen: true, type: 'alert', alertType: 'danger', title: '錯誤', message: '存檔失敗，請檢查權限或網路' });
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleDeleteMonth = (monthKey, formsToDelete) => {
     setModal({
       isOpen: true, type: 'confirm', alertType: 'danger', title: '⚠️ 刪除確認', message: `確定要刪除「${monthKey}」的 ${formsToDelete.length} 筆資料嗎？\n\n(請確認已下載備份，刪除後無法復原)`,
       onConfirm: async () => {
           try {
               let deleteCount = 0;
               for (const docData of formsToDelete) {
                   await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', docData.id));
                   deleteCount++;
               }
               setForms(prev => prev.filter(f => !formsToDelete.some(d => d.id === f.id)));
               logAction(db, appId, user, LOG_TYPES.BATCH_DELETE, `批量刪除月份 [${monthKey}]，共刪除 ${deleteCount} 筆資料`);
               setTimeout(() => openAlert('刪除成功', `已刪除 ${monthKey} 的所有選定資料。`), 500);
           } catch (err) {
               console.error("Delete process error", err);
               setTimeout(() => openAlert('刪除失敗', '流程發生錯誤，請稍後再試。', 'danger'), 500);
           }
       }
     });
  };

  const handleExportClick = () => setIsExportModalOpen(true);
  const handleCloseExportModal = () => { setIsExportModalOpen(false); setExportStartDate(''); setExportEndDate(''); };

  const handleConfirmExport = () => {
    let dataToExport = forms;
    if (exportMode === 'date' && exportStartDate && exportEndDate) {
        dataToExport = forms.filter(form => {
            if (!form.serialId) return false;
            const parts = form.serialId.replace(/[()]/g, '').split('-');
            if (parts.length < 2) return false; 
            const createdDate = form.createdAt?.toDate ? form.createdAt.toDate() : new Date();
            const formDateStr = `${createdDate.getFullYear()}-${parts[0]}-${parts[1]}`;
            return formDateStr >= exportStartDate && formDateStr <= exportEndDate;
        });
    } else if (exportMode === 'completed') {
        dataToExport = forms.filter(form => STATUS_STEPS[form.status]?.phase === 3);
    }
    
    if (dataToExport.length === 0) { openAlert('匯出失敗', '選擇的範圍內沒有資料。', 'danger'); return; }
    setShowExportFormatSelect(true);
  };

  const executeExport = (format) => {
    let dataToExport = forms;
    if (exportMode === 'date' && exportStartDate && exportEndDate) {
        dataToExport = forms.filter(form => {
            if (!form.serialId) return false;
            const parts = form.serialId.replace(/[()]/g, '').split('-');
            const createdDate = form.createdAt?.toDate ? form.createdAt.toDate() : new Date();
            const formDateStr = `${createdDate.getFullYear()}-${parts[0]}-${parts[1]}`;
            return formDateStr >= exportStartDate && formDateStr <= exportEndDate;
        });
    } else if (exportMode === 'completed') {
        dataToExport = forms.filter(form => STATUS_STEPS[form.status]?.phase === 3);
    }
    dataToExport.sort((a, b) => (b.serialId || '').localeCompare(a.serialId || ''));

    const dateRangeStr = exportMode === 'date' ? `${isoToMinguo(exportStartDate).replace(/-/g, '')}-${isoToMinguo(exportEndDate).replace(/-/g, '')}` : (exportMode === 'completed' ? '結案存檔' : '全部');
    
    if (format === 'json') {
        downloadJSON(generateBackupJSON(dataToExport), `系統備份_${dateRangeStr}.json`);
        logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出系統備份(JSON)：模式 [${exportMode}]，共 ${dataToExport.length} 筆`);
    } else {
        downloadCSV(generateCSV(dataToExport), `申請單報表_${dateRangeStr}.csv`);
        logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出報表(CSV)：模式 [${exportMode}]，共 ${dataToExport.length} 筆`);
    }
    setShowExportFormatSelect(false); handleCloseExportModal();
  };

  const handleManageCompleted = () => setIsManageModalOpen(true);
  const handleDebugClear = () => setIsDebugClearOpen(true);

  const handleImportFile = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
        openAlert('格式不支援', '為確保資料完整性與歷程紀錄，系統目前僅開放 JSON 備份檔匯入。\n\nCSV 格式僅供「匯出報表」使用，無法匯入。', 'warning');
        e.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
          const importedData = JSON.parse(content);
          if (!Array.isArray(importedData)) throw new Error("無效的備份資料");
          setModal({
              isOpen: true, type: 'confirm', title: '系統備份匯入', message: `偵測到 JSON 備份檔，包含 ${importedData.length} 筆資料。\n\n確定要匯入嗎？`,
              onConfirm: async () => {
                  try {
                      const mergedData = processBackupImport(forms, importedData);
                      const batch = writeBatch(db);
                      let count = 0;
                      mergedData.forEach(item => { if (item.id) { batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', item.id), item, { merge: true }); count++; }});
                      await batch.commit();
                      logAction(db, appId, user, LOG_TYPES.IMPORT, `JSON 備份匯入成功：更新 ${count} 筆資料`);
                      openAlert('匯入成功', `成功還原/更新 ${count} 筆資料 (含完整歷程)。`);
                  } catch (err) { console.error("JSON Import Error:", err); openAlert('匯入錯誤', '寫入資料庫時發生錯誤。', 'danger'); }
              }
          });
      } catch (error) { openAlert('格式錯誤', '無法解析 JSON 檔案。', 'danger'); }
      e.target.value = ''; 
    };
    reader.readAsText(file); e.target.value = '';
  };

  const openAlert = (title, message, type='info') => setModal({ isOpen: true, type: 'alert', title, message, alertType: type });
  const openConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });

  const handleActionClick = (type, form) => {
    if (type === 'edit') handleEditClick(form);
    else if (type === 'delete') {
        setModal({ 
            isOpen: true, type: 'confirm', title: '確認刪除', message: '確定要刪除這筆紀錄嗎？', 
            alertType: 'danger',
            onConfirm: async () => { 
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id));
                setForms(prev => prev.filter(f => f.id !== form.id));
                logAction(db, appId, user, LOG_TYPES.DELETE, `刪除申請單：${form.serialId} (${form.applicant})`);
            } 
        });
    }
    else if (type === 'revert') {
       const prevStatusKey = REVERSE_STEPS[form.status];
       if (prevStatusKey) {
         setModal({ isOpen: true, type: 'action', title: '確認退回', message: '請填寫退回原因', showNoteInput: true, noteRequired: true, 
             alertType: 'danger',
             onConfirm: async ({note}) => {
             const timestamp = new Date().toISOString();
             await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), {
                status: prevStatusKey, logs: [...(form.logs || []), { status: prevStatusKey, timestamp, note: `退回至：${STATUS_STEPS[prevStatusKey].label} [原因: ${note}]`, operator: getOperatorName(user) }], updatedAt: serverTimestamp()
             });
             logAction(db, appId, user, LOG_TYPES.STATUS_CHANGE, `退回單號 ${form.serialId} 至 ${STATUS_STEPS[prevStatusKey].label}。原因：${note}`);
         }});
       }
    } else if (type === 'advance') {
        const step = STATUS_STEPS[form.status];
        if (step && step.nextAction) {
             setModal({ isOpen: true, type: 'action', title: `確認${step.nextAction}`, message: `即將進入：${step.nextAction}`, showPickupInput: step.requirePickupName, onConfirm: async ({note, pickupName}) => {
                 let targetStatus = null;
                 const keys = Object.keys(STATUS_STEPS);
                 const idx = keys.indexOf(form.status);
                 if (idx !== -1 && idx < keys.length - 1) targetStatus = keys[idx + 1];
                 if (targetStatus) {
                    const timestamp = new Date().toISOString();
                    const updatePayload = {
                        status: targetStatus, logs: [...(form.logs || []), { status: targetStatus, timestamp, note: note ? `${STATUS_STEPS[targetStatus].label} [備註: ${note}]` : STATUS_STEPS[targetStatus].label, operator: getOperatorName(user) }], updatedAt: serverTimestamp(), [`time_${targetStatus}`]: timestamp
                    };
                    if (pickupName) updatePayload.receiverName = pickupName;
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), updatePayload);
                    logAction(db, appId, user, LOG_TYPES.STATUS_CHANGE, `推進單號 ${form.serialId} 至 ${STATUS_STEPS[targetStatus].label}。${note ? '備註:'+note : ''}`);
                 }
             }});
        }
    }
  };

  if (authLoading) return (<div className="min-h-screen flex items-center justify-center bg-slate-100"><Clock className="text-blue-600 animate-spin" size={40} /></div>);
  if (!user) return (<LoginPage onLogin={handleLogin} loading={authLoading} error={authError} isPreview={false} />);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20 md:pb-0"> 
      <GlobalModal 
        modal={modal} 
        onClose={() => setModal({ ...modal, isOpen: false })} 
        onConfirm={modal.onConfirm} 
        unitOptions={unitOptions} 
        applicantOptions={applicantOptions}
      />
      <ManageCompletedModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} forms={forms} onDeleteMonth={handleDeleteMonth} onExport={() => { const hasCompletedForms = forms.some(f => STATUS_STEPS[f.status]?.phase === 3); if (!hasCompletedForms) { openAlert('匯出失敗', '目前沒有已結案的資料可供備份。', 'danger'); return; } setExportMode('completed'); setShowExportFormatSelect(true); }} statusSteps={STATUS_STEPS} />
      <DebugClearModal isOpen={isDebugClearOpen} onClose={() => setIsDebugClearOpen(false)} forms={forms} onDeleteMonth={handleDeleteMonth} />
      <LogViewerModal isOpen={isLogViewerOpen} onClose={() => setIsLogViewerOpen(false)} db={db} appId={appId} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialData={{ units: unitOptions, projects: projectOptions, vendors: vendorOptions, applicants: applicantOptions }} onSave={() => {}} db={db} appId={appId} openAlert={openAlert} openConfirm={openConfirm} />
      <ExportModal isOpen={isExportModalOpen} onClose={handleCloseExportModal} onConfirm={handleConfirmExport} mode={exportMode} setMode={setExportMode} startDate={exportStartDate} setStartDate={setExportStartDate} endDate={exportEndDate} setEndDate={setExportEndDate} />
      {showExportFormatSelect && (<div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200"><div className="text-center mb-6"><div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><Download size={32} /></div><h3 className="text-2xl font-bold text-slate-800">請選擇匯出格式</h3><p className="text-slate-500 mt-2">請根據您的用途選擇適合的檔案格式</p></div><div className="space-y-3 mb-6"><button onClick={() => executeExport('json')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300 transition-all group text-left"><div className="bg-white p-3 rounded-lg shadow-sm text-blue-600 group-hover:scale-110 transition-transform"><FileJson size={28} /></div><div><div className="font-bold text-slate-800 text-lg">系統備份 (JSON)</div><div className="text-sm text-slate-500">完整保留所有歷程紀錄</div></div></button><button onClick={() => executeExport('csv')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-300 transition-all group text-left"><div className="bg-white p-3 rounded-lg shadow-sm text-emerald-600 group-hover:scale-110 transition-transform"><FileSpreadsheet size={28} /></div><div><div className="font-bold text-slate-800 text-lg">一般報表 (CSV)</div><div className="text-sm text-slate-500">Excel 表格格式，僅供列印或檢視</div></div></button></div><button onClick={() => setShowExportFormatSelect(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">取消</button></div></div>)}
      {isFormOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 border border-blue-200"><div className="flex justify-between items-center mb-6 pb-4 border-b"><h3 className="font-bold text-lg flex items-center gap-2 text-blue-800">{isEditMode ? <Edit2 size={20} /> : <Box size={20} />} {isEditMode ? '修改申請單' : '立案申請單'}</h3><div className="flex items-center gap-3"><div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-mono border border-blue-100">流水號：{previewSerialId}</div><button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button></div></div><form onSubmit={handleFormSubmit} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-12 gap-4"><div className="col-span-12 md:col-span-3"><label className="block text-xs font-bold text-slate-500 mb-1">申請單位 *</label>
      {isCustomUnit ? (
          <div className="flex gap-2">
            <input type="text" value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="請輸入單位名稱..." className="w-full p-2 border rounded-lg h-12 text-lg" autoFocus />
            <button type="button" onClick={() => { setIsCustomUnit(false); setNewUnit(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded h-12 w-12 flex items-center justify-center"><X size={20} /></button>
          </div>
      ) : (
          <SearchableSelect options={unitOptions} value={newUnit} onChange={(val) => setNewUnit(val)} placeholder="選擇或搜尋單位..." onCustomClick={(val) => { setIsCustomUnit(true); setNewUnit(val || ''); }} />
      )}
      </div><div className="col-span-12 md:col-span-3"><label className="block text-xs font-bold text-slate-500 mb-1">申請人 *</label>
      {isCustomApplicant ? (
          <div className="flex gap-2">
            <input type="text" value={newApplicant} onChange={e => setNewApplicant(e.target.value)} placeholder="請輸入申請人..." className="w-full p-2 border rounded-lg h-12 text-lg" autoFocus />
            <button type="button" onClick={() => { setIsCustomApplicant(false); setNewApplicant(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded h-12 w-12 flex items-center justify-center"><X size={20} /></button>
          </div>
      ) : (
          <SearchableSelect options={availableApplicants} value={newApplicant} onChange={(val) => setNewApplicant(val)} placeholder="選擇或搜尋申請人..." onCustomClick={(val) => { setIsCustomApplicant(true); setNewApplicant(val || ''); }} />
      )}
      </div><div className="col-span-12 md:col-span-6"><label className="block text-xs font-bold text-slate-500 mb-1">計畫補助 (選填)</label>{isCustomSubsidy ? (<div className="flex gap-2"><input type="text" value={newSubsidy} onChange={e => setNewSubsidy(e.target.value)} placeholder="請輸入計畫名稱..." className="w-full p-2 border rounded-lg h-12 text-lg" autoFocus /><button type="button" onClick={() => { setIsCustomSubsidy(false); setNewSubsidy(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded h-12 w-12 flex items-center justify-center"><X size={20} /></button></div>) : (<SearchableSelect options={projectOptions} value={newSubsidy} onChange={(val) => setNewSubsidy(val)} placeholder="選擇或搜尋計畫..." onCustomClick={(val) => { setIsCustomSubsidy(true); setNewSubsidy(val || ''); }} />)}</div></div><div className="flex flex-col md:flex-row gap-4"><div className="w-full md:w-[70%]"><label className="block text-xs font-bold text-slate-500 mb-1">廠商 (選填)</label>{isCustomVendor ? (<div className="flex gap-2"><input type="text" value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder="請輸入廠商名稱..." className="w-full p-2 border rounded-lg h-12 text-lg" autoFocus /><button type="button" onClick={() => { setIsCustomVendor(false); setNewVendor(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded h-12 w-12 flex items-center justify-center"><X size={20} /></button></div>) : (<SearchableSelect options={vendorOptions} value={newVendor} onChange={(val) => setNewVendor(val)} placeholder="選擇或搜尋廠商..." onCustomClick={(val) => { setIsCustomVendor(true); setNewVendor(val || ''); }} />)}</div><div className="w-full md:w-[30%]"><label className="block text-xs font-bold text-slate-500 mb-1">申請單日期 (選填)</label><MinguoDateInput value={newApplicationDate} onChange={setNewApplicationDate} /></div></div><div><label className="block text-xs font-bold text-slate-500 mb-1">案件背景備註 (選填)</label><input type="text" placeholder="時程或其他重要備註" value={newGlobalRemark} onChange={e => setNewGlobalRemark(e.target.value)} className="w-full p-2 border rounded-lg h-12 text-lg" /></div><div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 py-2 rounded border border-red-100 h-12"><input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="w-5 h-5 text-red-600 rounded" /><span className={`text-sm font-bold ${isUrgent?'text-red-600':'text-slate-500'}`}>{isUrgent?'🔥 設定為速件':'一般案件'}</span></label></div><div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><ShoppingCart size={16} /> 購買項目清單</label><div className="space-y-3">{newItems.map((item, index) => (<div key={item.id} className="group relative flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-300"><div className="hidden md:flex items-center justify-center w-6 text-slate-400 font-mono text-sm self-center">{index + 1}.</div><div className="flex-1"><label className="block md:hidden text-xs font-bold text-slate-500 mb-1">品項名稱</label><textarea placeholder="品項名稱 *" value={item.subject} onChange={e => handleItemChange(index, 'subject', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 resize-y min-h-[52px]" rows={1} required /></div><div className="flex gap-2 w-full md:w-auto"><div className="w-28 shrink-0"><label className="block md:hidden text-xs font-bold text-slate-500 mb-1">數量</label><input type="number" placeholder="數量 *" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" required /></div><div className="w-20 shrink-0"><label className="block md:hidden text-xs font-bold text-slate-500 mb-1">單位</label><input type="text" placeholder="單位" value={item.measureUnit} onChange={e => handleItemChange(index, 'measureUnit', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div><div className="flex-1 md:w-40"><label className="block md:hidden text-xs font-bold text-slate-500 mb-1">單價</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><input type="number" placeholder="單價 *" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} className="w-full pl-6 pr-3 py-3 border border-slate-300 rounded-lg text-right text-lg focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" required /></div></div></div><div className="flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto"><div className="md:hidden text-sm text-slate-500 font-medium">小計</div><div className="text-lg font-bold text-blue-600 w-24 text-right">${((parseInt(item.quantity)||0)*(parseInt(item.unitPrice)||0)).toLocaleString()}</div><button type="button" onClick={() => handleRemoveItem(index)} className={`p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ${newItems.length===1?'invisible':''}`} title="移除此項目"><X size={20} /></button></div></div>))}</div><div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200"><button type="button" onClick={handleAddItem} className="text-sm text-blue-600 flex items-center gap-1 font-bold hover:underline"><Plus size={16} /> 新增品項</button><div className="text-xl font-black">總預算: <span className="text-blue-600">${totalAmount.toLocaleString()}</span></div></div></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg h-12" disabled={isSubmitting}>取消</button><button type="submit" className={`px-8 py-2 text-white rounded-lg font-bold shadow-md flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} h-12`} disabled={isSubmitting}>{isSubmitting ? (<><Loader2 className="animate-spin" size={20} />處理中...</>) : (isEditMode ? '儲存修改' : '確認立案 (並新增下一筆)')}</button></div></form></div></div>)}

      <div className="max-w-7xl mx-auto p-4 md:p-6 text-center">
        <AppHeader 
          user={user}
          onImportFile={handleImportFile}
          onOpenLog={() => setIsLogViewerOpen(true)}
          onDebugClear={handleDebugClear}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          onOpenCreate={handleOpenCreate}
        />

        <FilterBar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onCloudSearch={handleCloudSearch}
          isSearchingCloud={isSearchingCloud}
          filterMonth={filterMonth}
          setFilterMonth={setFilterMonth}
          monthTabs={monthTabs}
          showUrgentOnly={showUrgentOnly}
          setShowUrgentOnly={setShowUrgentOnly}
          filterVendor={filterVendor}
          setFilterVendor={setFilterVendor}
          vendorOptions={vendorOptions}
          filterPhase={filterPhase}
          setFilterPhase={setFilterPhase}
          filterStartDate={filterStartDate}
          setFilterStartDate={setFilterStartDate}
          filterEndDate={filterEndDate}
          setFilterEndDate={setFilterEndDate}
          onManageCompleted={handleManageCompleted}
          onExport={handleExportClick}
        />

        <div className="space-y-4">
          {formsLoading ? (
            <div className="bg-white p-12 rounded-2xl text-center shadow-sm"><Clock className="mx-auto mb-4 text-blue-200 animate-spin" size={40} /><p className="text-slate-400 font-medium">雲端同步中...</p></div>
          ) : filteredForms.length === 0 ? (
            <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-dashed border-slate-300"><FileText className="mx-auto mb-4 text-slate-200" size={48} /><p className="text-slate-400">沒有符合條件的資料</p></div>
          ) : (
            <>
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left table-fixed">
                  <thead className="bg-slate-50 text-sm text-slate-600 font-bold border-b">
                    <tr>
                        <th className="p-4 w-12 text-center"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedIds.size > 0 && selectedIds.size === filteredForms.length} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></th>
                        <th className="p-4 w-32 lg:w-1/6">單位/流水號</th>
                        <th className="p-4 w-1/3">採購內容/金額</th>
                        <th className="p-4 whitespace-nowrap">狀態/時間</th>
                        <th className="p-4 whitespace-nowrap">操作</th>
                        <th className="p-4 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredForms.map(f => (
                        <FormRow 
                            key={f.id} form={f} expandedId={expandedId} setExpandedId={setExpandedId} onAction={handleActionClick} 
                            selected={selectedIds.has(f.id)} onSelect={handleSelectOne} 
                            statusSteps={STATUS_STEPS} canRevert={!!REVERSE_STEPS[f.status]} 
                        />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="block md:hidden space-y-3">
                <div className="flex justify-between items-center px-2 pb-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedIds.size > 0 && selectedIds.size === filteredForms.length} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        全選本頁 ({filteredForms.length})
                    </label>
                </div>
                {filteredForms.map(f => (
                    <MobileFormCard 
                        key={f.id} form={f} expandedId={expandedId} setExpandedId={setExpandedId} onAction={handleActionClick} statusSteps={STATUS_STEPS}
                        selected={selectedIds.has(f.id)} onSelect={handleSelectOne}
                        canRevert={!!REVERSE_STEPS[f.status]} 
                    />
                ))}
              </div>
            </>
          )}
        </div>
        
        {selectedIds.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-200 p-3 shadow-lg flex justify-center gap-4 items-center z-40">
                <div className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <CheckSquare size={16} />
                    已選取 {selectedIds.size} 筆
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleBatchAction('advance')} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm active:scale-95 transition-transform"><ArrowRight size={16} /> 批量推進</button>
                    <button onClick={() => handleBatchAction('revert')} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm active:scale-95 transition-transform"><RotateCcw size={16} /> 批量退回</button>
                    <button onClick={() => handleBatchAction('receiver')} className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg shadow-sm active:scale-95 transition-transform"><UserCheck size={16} /> 批量領回</button>
                    <button onClick={() => handleBatchAction('direct_complete')} className="flex items-center gap-1 px-3 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm active:scale-95 transition-transform"><CheckCheck size={16} /> 直接結案</button>
                    <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={20} /></button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}