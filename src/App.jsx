import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  deleteDoc, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  Plus, Search, Calendar, Flame, Filter, Edit2, Upload, Download, LogOut, FileText, Clock, FolderCog, ShoppingCart, X, Loader2, Settings, Box, Wrench, Activity
} from 'lucide-react';

// --- 引入拆分出去的設定與工具 ---
import { auth, db, appId } from './firebase'; 
import { STATUS_STEPS, DEFAULT_UNITS, DEFAULT_PROJECTS, DEFAULT_VENDORS, DEFAULT_DOMAIN, REVERSE_STEPS, LABEL_TO_STATUS } from './constants';
import { isoToMinguo, generateMonthList, parseCSVLine, getOperatorName, generateCSV, downloadCSV } from './utils';
import { logAction, LOG_TYPES } from './logger'; 

// --- 引入拆分出去的元件 ---
import LoginPage from './components/LoginPage';
import MinguoDateInput from './components/MinguoDateInput';
import SearchableSelect from './components/SearchableSelect';
import SettingsModal from './components/SettingsModal';
import ManageCompletedModal from './components/ManageCompletedModal';
import DebugClearModal from './components/DebugClearModal';
import ExportModal from './components/ExportModal';
import GlobalModal from './components/GlobalModal';
import FormRow from './components/FormRow';
import LogViewerModal from './components/LogViewerModal'; // ★ 引入日誌視窗

// ★★★ 管理員白名單 ★★★
const ADMIN_EMAILS = [`268${DEFAULT_DOMAIN}`]; 

export default function App() {
  const [user, setUser] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [projectOptions, setProjectOptions] = useState(DEFAULT_PROJECTS);
  const [vendorOptions, setVendorOptions] = useState(DEFAULT_VENDORS);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [monthTabs] = useState(generateMonthList());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '' });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false); 
  const [isDebugClearOpen, setIsDebugClearOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false); // ★ 日誌視窗狀態

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportMode, setExportMode] = useState('all');

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const totalAmount = newItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0);

  // --- 監聽 Auth 狀態 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  // --- 監聽申請單資料 ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setForms(data);
    });
    return () => unsubscribe();
  }, [user]);

  // --- 監聽設定檔資料 ---
  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.units) setUnitOptions(data.units);
        if (data.projects) setProjectOptions(data.projects);
        if (data.vendors) setVendorOptions(data.vendors);
      } else {
        setDoc(settingsRef, { units: DEFAULT_UNITS, projects: DEFAULT_PROJECTS, vendors: DEFAULT_VENDORS })
          .catch(err => { console.error("Auto-init settings failed:", err); });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- 鎖定捲軸 ---
  useEffect(() => {
    if (isSettingsOpen || isFormOpen || isExportModalOpen || modal.isOpen || isManageModalOpen || isDebugClearOpen || isLogViewerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSettingsOpen, isFormOpen, isExportModalOpen, modal.isOpen, isManageModalOpen, isDebugClearOpen, isLogViewerOpen]);

  // --- 登入相關函式 ---
  const handleLogin = async (username, password) => {
      setAuthLoading(true);
      setAuthError('');
      try {
          const email = `${username}${DEFAULT_DOMAIN}`;
          await signInWithEmailAndPassword(auth, email, password);
          logAction(db, appId, auth.currentUser, LOG_TYPES.LOGIN, `使用者 ${username} 登入成功`);
      } catch (err) {
          console.error(err);
          setAuthError('登入失敗，請檢查帳號密碼');
      } finally {
          setAuthLoading(false);
      }
  };

  const handleAnonymousLogin = async () => {
      setAuthLoading(true);
      setAuthError('');
      try {
           await signInAnonymously(auth);
           logAction(db, appId, auth.currentUser, LOG_TYPES.LOGIN, '訪客登入');
      } catch (err) {
          console.error(err);
          setAuthError('訪客登入失敗');
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => {
      if (confirm('確定要登出系統嗎？')) {
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

  // --- 資料篩選邏輯 ---
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      if (filterMonth !== 'all') {
        const d = form.createdAt?.toDate ? form.createdAt.toDate() : new Date();
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (m !== filterMonth) return false;
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
  }, [forms, searchTerm, filterPhase, filterMonth, showUrgentOnly]);

  // --- 流水號生成 ---
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

  // --- 表單操作 ---
  const handleAddItem = () => setNewItems([...newItems, { id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
  const handleRemoveItem = (index) => { if (newItems.length > 1) { const updated = [...newItems]; updated.splice(index, 1); setNewItems(updated); } };
  const handleItemChange = (index, field, value) => { const updated = [...newItems]; updated[index][field] = value; setNewItems(updated); };

  const resetForm = () => {
    setNewUnit(''); setNewApplicant(''); 
    setNewSubsidy(''); setIsCustomSubsidy(false); 
    setNewVendor(''); setIsCustomVendor(false);    
    setNewGlobalRemark(''); setIsUrgent(false); 
    setNewApplicationDate(''); 
    setNewItems([{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
    setIsEditMode(false);
    setEditingFormId(null);
    setPreviewSerialId('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const handleEditClick = (form) => {
    setNewUnit(form.unit || '');
    setNewApplicant(form.applicant || '');
    setNewSubsidy(form.subsidy || '');
    setNewVendor(form.vendor || '');
    setNewGlobalRemark(form.globalRemark || '');
    setNewApplicationDate(form.applicationDate || '');
    setIsUrgent(form.isUrgent || false);
    
    const items = (form.items || []).map((item, idx) => ({
      ...item,
      id: item.id || Date.now() + idx
    }));
    setNewItems(items.length > 0 ? items : [{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
    
    setPreviewSerialId(form.serialId);
    setEditingFormId(form.id);
    setIsEditMode(true);
    
    if (form.subsidy && !projectOptions.includes(form.subsidy) && form.subsidy !== '無計畫 (公務)') setIsCustomSubsidy(true);
    else setIsCustomSubsidy(false);
    
    if (form.vendor && !vendorOptions.includes(form.vendor)) setIsCustomVendor(true);
    else setIsCustomVendor(false);

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
      let updatedProjects = [...projectOptions];
      let projectsChanged = false;
      const trimmedSubsidy = newSubsidy.trim();
      if (trimmedSubsidy && !projectOptions.includes(trimmedSubsidy) && trimmedSubsidy !== '無計畫 (公務)') {
        if (window.confirm(`檢測到新的計畫來源：「${trimmedSubsidy}」，是否要加入常用清單？`)) {
          updatedProjects.push(trimmedSubsidy);
          projectsChanged = true;
        }
      }

      let updatedVendors = [...vendorOptions];
      let vendorsChanged = false;
      const trimmedVendor = newVendor.trim();
      if (trimmedVendor && !vendorOptions.includes(trimmedVendor)) {
        if (window.confirm(`檢測到新的廠商：「${trimmedVendor}」，是否要加入常用清單？`)) {
          updatedVendors.push(trimmedVendor);
          vendorsChanged = true;
        }
      }

      if (projectsChanged || vendorsChanged) {
        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1');
        const updateData = {};
        if (projectsChanged) updateData.projects = updatedProjects;
        if (vendorsChanged) updateData.vendors = updatedVendors;
        
        const settingsUpdatePromise = setDoc(settingsRef, updateData, { merge: true });
        await Promise.race([
            settingsUpdatePromise,
            new Promise((resolve) => setTimeout(resolve, 500)) 
        ]);
      }

      const timestamp = new Date().toISOString();
      const mainSubject = newItems.map(i => i.subject).join('、');
      
      const formData = {
        unit: newUnit, 
        applicant: newApplicant, 
        isUrgent, 
        globalRemark: newGlobalRemark,
        vendor: newVendor,
        applicationDate: newApplicationDate, 
        items: newItems.map(i => ({ subject: i.subject, quantity: parseInt(i.quantity) || 1, measureUnit: i.measureUnit || '個', unitPrice: parseInt(i.unitPrice) || 0, subtotal: (parseInt(i.quantity) || 0) * (parseInt(i.unitPrice) || 0) })),
        subject: mainSubject, 
        totalPrice: totalAmount, 
        subsidy: newSubsidy, 
        updatedAt: serverTimestamp()
      };

      let dbPromise;
      let logType = '';
      let logDetail = '';

      if (isEditMode && editingFormId) {
         dbPromise = updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', editingFormId), formData);
         logType = LOG_TYPES.UPDATE;
         logDetail = `修改申請單：${previewSerialId} (金額: ${totalAmount})`;
      } else {
         const newSerialId = generateSerialId();
         formData.serialId = newSerialId;
         formData.status = 'P1_RECEIVED'; 
         formData.logs = [{ 
             status: 'P1_RECEIVED', 
             timestamp, 
             note: '案件成立並完成收件',
             operator: getOperatorName(user) 
         }];
         formData.time_P1_RECEIVED = timestamp;
         formData.createdAt = serverTimestamp();
         dbPromise = addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'), formData);
         logType = LOG_TYPES.CREATE;
         logDetail = `新增申請單：${newSerialId} (金額: ${totalAmount})`;
      }

      await Promise.race([
          dbPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      ]);

      logAction(db, appId, user, logType, logDetail);

      if (isEditMode) {
         setIsFormOpen(false); 
         setModal({ isOpen: true, title: '修改成功', message: `單號 ${previewSerialId} 資料已更新！` });
      } else {
         resetForm(); 
         setModal({ isOpen: true, title: '新增成功', message: `申請單已立案！表格已清空。` });
      }
      
    } catch (err) { 
      if (err.message === 'timeout') {
          console.log("Firestore operation timed out (offline mode active)");
          if (isEditMode) {
             setIsFormOpen(false); 
             setModal({ isOpen: true, title: '已儲存 (離線模式)', message: `單號 ${previewSerialId} 已暫存於瀏覽器，連線後將自動同步。` });
          } else {
             resetForm(); 
             setModal({ isOpen: true, title: '已新增 (離線模式)', message: `申請單已暫存於瀏覽器，連線後將自動同步。` });
          }
      } else {
          console.error(err);
          setModal({ isOpen: true, type: 'alert', alertType: 'danger', title: '錯誤', message: '存檔失敗，請檢查權限或網路' });
      }
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleDeleteMonth = (monthKey, formsToDelete) => {
     console.log(`[App] 準備刪除月份: ${monthKey}, 筆數: ${formsToDelete.length}`);
     setModal({
       isOpen: true,
       type: 'confirm',
       alertType: 'danger',
       title: '⚠️ 刪除確認',
       message: `確定要刪除「${monthKey}」的 ${formsToDelete.length} 筆資料嗎？\n\n(請確認已下載備份，刪除後無法復原)`,
       onConfirm: async () => {
           console.log("[App] 開始順序刪除...");
           try {
               let deleteCount = 0;
               for (const docData of formsToDelete) {
                   try {
                       await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', docData.id));
                       deleteCount++;
                   } catch (innerErr) {
                       console.error("Failed to delete doc:", docData.id, innerErr);
                   }
               }
               console.log("[App] 刪除完成");
               
               logAction(db, appId, user, LOG_TYPES.BATCH_DELETE, `批量刪除月份 [${monthKey}]，共刪除 ${deleteCount} 筆資料`);

               setTimeout(() => {
                     openAlert('刪除成功', `已刪除 ${monthKey} 的所有選定資料。`);
               }, 500);

           } catch (err) {
               console.error("Delete process error", err);
               setTimeout(() => {
                   openAlert('刪除失敗', '流程發生錯誤，請稍後再試。', 'danger');
               }, 500);
           }
       }
     });
  };

  const handleExportClick = () => { setIsExportModalOpen(true); };
  const handleCloseExportModal = () => {
      setIsExportModalOpen(false);
      setExportStartDate('');
      setExportEndDate('');
  };

  const handleConfirmExport = () => {
    let dataToExport = forms; 
    
    if (exportMode === 'date') {
        if (!exportStartDate || !exportEndDate) {
            openAlert('匯出失敗', '請選擇完整的起始與結束日期。', 'danger');
            return;
        }

        dataToExport = forms.filter(form => {
            if (!form.serialId) return false;
            const idContent = form.serialId.replace(/[()]/g, '');
            const parts = idContent.split('-');
            if (parts.length < 2) return false; 
            const month = parts[0];
            const day = parts[1];
            const createdDate = form.createdAt?.toDate ? form.createdAt.toDate() : new Date();
            const year = createdDate.getFullYear();
            const formDateStr = `${year}-${month}-${day}`;
            return formDateStr >= exportStartDate && formDateStr <= exportEndDate;
        });
        
        dataToExport.sort((a, b) => {
              const dateA = a.applicationDate || (a.createdAt?.toDate ? a.createdAt.toDate().toISOString().split('T')[0] : '');
              const dateB = b.applicationDate || (b.createdAt?.toDate ? b.createdAt.toDate().toISOString().split('T')[0] : '');
              return dateB.localeCompare(dateA); 
        });
    } else if (exportMode === 'completed') {
        dataToExport = forms.filter(form => STATUS_STEPS[form.status]?.phase === 3);
    }

    if (dataToExport.length === 0) {
      openAlert('匯出失敗', '選擇的範圍內沒有資料。', 'danger');
      return;
    }

    const dateRangeStr = exportMode === 'date' 
        ? `${isoToMinguo(exportStartDate).replace(/-/g, '')}-${isoToMinguo(exportEndDate).replace(/-/g, '')}`
        : (exportMode === 'completed' ? '結案存檔' : '全部');
    
    logAction(db, appId, user, LOG_TYPES.EXPORT, `匯出報表：模式 [${exportMode}]，區間 [${dateRangeStr}]，共 ${dataToExport.length} 筆`);

    const csvContent = generateCSV(dataToExport);
    downloadCSV(csvContent, `申請單報表_${dateRangeStr}.csv`);
    
    handleCloseExportModal();
  };

  const handleManageCompleted = () => {
    setIsManageModalOpen(true);
  };
  
  const handleDebugClear = () => {
    setIsDebugClearOpen(true);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rawRows = text.split(/\r?\n/);
      const rows = rawRows.map(row => parseCSVLine(row));
      
      const header = rows[0];
      const isNewFormat = header && header.some(h => h && h.includes('品項名稱')) && header.some(h => h && h.includes('單價'));
      const isSystemExport = header && header[0] && header[0].includes('流水號'); 
      const dataRows = rows.slice(1).filter(r => r.length > 5 && r[0]);

      if (dataRows.length === 0) { 
        openAlert('匯入失敗', '未偵測到有效資料。請確認 CSV 格式是否正確。', 'danger'); 
        return; 
      }

      const existingIds = new Set(forms.map(f => f.serialId));
      let duplicateCount = 0;
      dataRows.forEach(row => {
          if (row[0] && existingIds.has(row[0])) {
              duplicateCount++;
          }
      });

      setModal({ isOpen: true, type: 'confirm', title: '舊檔匯入', 
        message: `偵測到 ${dataRows.length} 筆資料列。\n\n• 預計更新/覆蓋: ${duplicateCount} 筆\n• 預計新增: 視合併狀況而定\n\n確定要匯入嗎？`, 
        onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          let count = 0;
          const formsMap = new Map();

          dataRows.forEach((row) => {
             if (isNewFormat || isSystemExport) {
                const serialId = row[0];
                if (!formsMap.has(serialId)) {
                    const statusLabel = row[14];
                    let status = LABEL_TO_STATUS[statusLabel] || 'COMPLETED';
                    const appDate = row[1];
                    const isUrgent = row[2] === '是';
                    const unit = row[4];
                    const applicant = row[5];
                    const subsidy = row[6];
                    const vendor = row[7];
                    const receiverName = row[13];
                    const globalRemark = row[15] || '';
                    formsMap.set(serialId, {
                        docRef: doc(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms')),
                        data: {
                            serialId, applicationDate: appDate, isUrgent, unit, applicant, subsidy, vendor, receiverName, status, globalRemark, items: [], totalPrice: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                            logs: [{ status, timestamp: new Date().toISOString(), note: '系統批次匯入' }]
                        }
                    });
                }
                const formObj = formsMap.get(serialId);
                const itemSubtotal = parseInt((row[12] || '0').replace(/[$,]/g, '')) || 0;
                formObj.data.items.push({
                    subject: row[8], quantity: parseInt(row[9]) || 1, measureUnit: row[10] || '個', unitPrice: parseInt((row[11] || '0').replace(/[$,]/g, '')) || 0, subtotal: itemSubtotal
                });
                formObj.data.totalPrice += itemSubtotal;
                formObj.data.subject = formObj.data.items.map(i => i.subject).join('、');
            }
          });
          formsMap.forEach((formObj) => { batch.set(formObj.docRef, formObj.data); count++; });
          await batch.commit();
          
          logAction(db, appId, user, LOG_TYPES.IMPORT, `CSV 匯入成功：共處理 ${count} 筆申請單資料`);

          openAlert('匯入成功', `成功合併並處理 ${count} 筆申請單。`);
        } catch (err) { openAlert('匯入錯誤', '資料格式有誤或寫入失敗。', 'danger'); }
      }});
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openAlert = (title, message, type='info') => setModal({ isOpen: true, type: 'alert', title, message, alertType: type });
  const openConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });

  const handleActionClick = (type, form) => {
    if (type === 'edit') handleEditClick(form);
    else if (type === 'delete') {
        setModal({ 
            isOpen: true, 
            type: 'confirm', 
            title: '確認刪除', 
            message: '確定要刪除這筆紀錄嗎？', 
            onConfirm: async () => { 
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id));
                logAction(db, appId, user, LOG_TYPES.DELETE, `刪除申請單：${form.serialId} (${form.applicant})`);
            } 
        });
    }
    else if (type === 'revert') {
       const prevStatusKey = REVERSE_STEPS[form.status];
       if (prevStatusKey) {
         setModal({ isOpen: true, type: 'action', title: '確認退回', message: '請填寫退回原因', showNoteInput: true, noteRequired: true, onConfirm: async ({note}) => {
             const timestamp = new Date().toISOString();
             await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), {
                status: prevStatusKey,
                logs: [...(form.logs || []), { status: prevStatusKey, timestamp, note: `退回至：${STATUS_STEPS[prevStatusKey].label} [原因: ${note}]`, operator: getOperatorName(user) }],
                updatedAt: serverTimestamp()
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
                        status: targetStatus,
                        logs: [...(form.logs || []), { status: targetStatus, timestamp, note: note ? `${STATUS_STEPS[targetStatus].label} [備註: ${note}]` : STATUS_STEPS[targetStatus].label, operator: getOperatorName(user) }],
                        updatedAt: serverTimestamp(),
                        [`time_${targetStatus}`]: timestamp
                    };
                    if (pickupName) updatePayload.receiverName = pickupName;
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), updatePayload);

                    logAction(db, appId, user, LOG_TYPES.STATUS_CHANGE, `推進單號 ${form.serialId} 至 ${STATUS_STEPS[targetStatus].label}。${note ? '備註:'+note : ''}`);
                 }
             }});
        }
    }
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <Clock className="text-blue-600 animate-spin" size={40} />
      </div>
  );

  if (!user) {
      return (
          <LoginPage 
            onLogin={handleLogin} 
            loading={authLoading}
            error={authError}
            isPreview={false} 
            onAnonymousLogin={handleAnonymousLogin}
          />
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <GlobalModal modal={modal} onClose={() => setModal({ ...modal, isOpen: false })} onConfirm={modal.onConfirm} />
      <ManageCompletedModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} forms={forms} onDeleteMonth={handleDeleteMonth} />
      <DebugClearModal isOpen={isDebugClearOpen} onClose={() => setIsDebugClearOpen(false)} forms={forms} onDeleteMonth={handleDeleteMonth} />
      
      {/* ★ 日誌視窗：放入 DOM 中 */}
      <LogViewerModal isOpen={isLogViewerOpen} onClose={() => setIsLogViewerOpen(false)} db={db} appId={appId} />
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialData={{ units: unitOptions, projects: projectOptions, vendors: vendorOptions }} onSave={() => {}} db={db} appId={appId} openAlert={openAlert} openConfirm={openConfirm} />
      <ExportModal isOpen={isExportModalOpen} onClose={handleCloseExportModal} onConfirm={handleConfirmExport} mode={exportMode} setMode={setExportMode} startDate={exportStartDate} setStartDate={setExportStartDate} endDate={exportEndDate} setEndDate={setExportEndDate} />
      
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 border border-blue-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
               <h3 className="font-bold text-lg flex items-center gap-2 text-blue-800">
                 {isEditMode ? <Edit2 size={20} /> : <Box size={20} />} 
                 {isEditMode ? '修改申請單' : '立案申請單'}
               </h3>
               <div className="flex items-center gap-3">
                 <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-mono border border-blue-100">流水號：{previewSerialId}</div>
                 <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
               </div>
            </div>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">申請單位 *</label>
                  <select value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-full p-2 border rounded-lg bg-white h-12" required>
                    <option value="" disabled>選擇處室...</option>
                    {unitOptions.map((u, i) => <option key={i} value={u}>{String(u)}</option>)}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">申請人 *</label>
                    <input type="text" placeholder="姓名" value={newApplicant} onChange={e => setNewApplicant(e.target.value)} className="w-full p-2 border rounded-lg h-12" required />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 mb-1">計畫補助 (選填)</label>
                  {isCustomSubsidy ? (
                    <div className="flex gap-2">
                      <input type="text" value={newSubsidy} onChange={e => setNewSubsidy(e.target.value)} placeholder="請輸入計畫名稱..." className="w-full p-2 border rounded-lg h-12" autoFocus />
                      <button type="button" onClick={() => { setIsCustomSubsidy(false); setNewSubsidy(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded h-12 w-12 flex items-center justify-center"><X size={20} /></button>
                    </div>
                  ) : (
                    <SearchableSelect options={projectOptions} value={newSubsidy} onChange={(val) => setNewSubsidy(val)} placeholder="選擇或搜尋計畫..." onCustomClick={(val) => { setIsCustomSubsidy(true); setNewSubsidy(val || ''); }} />
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                 <div className="w-full md:w-[70%]">
                  <label className="block text-xs font-bold text-slate-500 mb-1">廠商 (選填)</label>
                  {isCustomVendor ? (
                    <div className="flex gap-2">
                      <input type="text" value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder="請輸入廠商名稱..." className="w-full p-2 border rounded-lg h-12" autoFocus />
                      <button type="button" onClick={() => { setIsCustomVendor(false); setNewVendor(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded h-12 w-12 flex items-center justify-center"><X size={20} /></button>
                    </div>
                  ) : (
                    <SearchableSelect options={vendorOptions} value={newVendor} onChange={(val) => setNewVendor(val)} placeholder="選擇或搜尋廠商..." onCustomClick={(val) => { setIsCustomVendor(true); setNewVendor(val || ''); }} />
                  )}
                </div>
                <div className="w-full md:w-[30%]">
                   <label className="block text-xs font-bold text-slate-500 mb-1">申請單日期 (選填)</label>
                   <MinguoDateInput value={newApplicationDate} onChange={setNewApplicationDate} />
                </div>
              </div>
              
              <div><label className="block text-xs font-bold text-slate-500 mb-1">案件背景備註 (選填)</label><input type="text" placeholder="時程或其他重要備註" value={newGlobalRemark} onChange={e => setNewGlobalRemark(e.target.value)} className="w-full p-2 border rounded-lg h-12" /></div>
              
              <div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 py-2 rounded border border-red-100 h-12"><input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="w-5 h-5 text-red-600 rounded" /><span className={`text-sm font-bold ${isUrgent?'text-red-600':'text-slate-500'}`}>{isUrgent?'🔥 設定為速件':'一般案件'}</span></label></div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><ShoppingCart size={16} /> 購買項目清單</label>
                <div className="space-y-3">
                  {newItems.map((item, index) => (
                    <div key={item.id} className="group relative flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-300">
                      <div className="hidden md:flex items-center justify-center w-6 text-slate-400 font-mono text-sm self-center">
                        {index + 1}.
                      </div>

                      <div className="flex-1">
                        <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">品項名稱</label>
                        <input 
                          type="text" 
                          placeholder="品項名稱 *" 
                          value={item.subject} 
                          onChange={e => handleItemChange(index, 'subject', e.target.value)} 
                          className="w-full p-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300" 
                          required
                        />
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                        <div className="w-28 shrink-0">
                           <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">數量</label>
                           <input 
                              type="number" 
                              placeholder="數量 *" 
                              value={item.quantity} 
                              onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                              className="w-full p-3 border border-slate-300 rounded-lg text-center text-base focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                              required 
                           />
                        </div>
                        <div className="w-20 shrink-0">
                           <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">單位</label>
                           <input 
                              type="text" 
                              placeholder="單位" 
                              value={item.measureUnit} 
                              onChange={e => handleItemChange(index, 'measureUnit', e.target.value)} 
                              className="w-full p-3 border border-slate-300 rounded-lg text-center text-base focus:ring-2 focus:ring-blue-500 outline-none" 
                           />
                        </div>
                        <div className="flex-1 md:w-40">
                           <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">單價</label>
                           <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                             <input 
                                type="number" 
                                placeholder="單價 *" 
                                value={item.unitPrice} 
                                onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} 
                                className="w-full pl-6 pr-3 py-3 border border-slate-300 rounded-lg text-right text-base focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                required 
                             />
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto">
                          <div className="md:hidden text-sm text-slate-500 font-medium">小計</div>
                          <div className="text-lg font-bold text-blue-600 w-24 text-right">
                             ${((parseInt(item.quantity)||0)*(parseInt(item.unitPrice)||0)).toLocaleString()}
                          </div>
                          <button 
                             type="button" 
                             onClick={() => handleRemoveItem(index)} 
                             className={`p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ${newItems.length===1?'invisible':''}`}
                             title="移除此項目"
                          >
                             <X size={20} />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200"><button type="button" onClick={handleAddItem} className="text-sm text-blue-600 flex items-center gap-1 font-bold hover:underline"><Plus size={16} /> 新增品項</button><div className="text-xl font-black">總預算: <span className="text-blue-600">${totalAmount.toLocaleString()}</span></div></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg h-12" disabled={isSubmitting}>取消</button>
                <button type="submit" className={`px-8 py-2 text-white rounded-lg font-bold shadow-md flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} h-12`} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={20} />處理中...</>
                  ) : (isEditMode ? '儲存修改' : '確認立案 (並新增下一筆)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6 text-center">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3"><div className="p-2 bg-blue-600 text-white rounded-lg"><FileText size={24} /></div><h1 className="text-xl font-bold">總務處申請單追蹤系統</h1></div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 bg-slate-50 border px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 text-sm font-medium transition-colors h-10">
              <Upload size={16} /> 舊檔匯入 <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>

            {/* ★ 修改：現在所有人都看得到這個日誌按鈕 */}
            <button onClick={() => setIsLogViewerOpen(true)} className="flex items-center gap-2 bg-slate-600 text-white px-3 py-2 rounded-lg hover:bg-slate-700 text-sm font-bold transition-colors h-10" title="查看系統日誌">
              <Activity size={16} /> 日誌
            </button>

            {/* 管理員專屬工具 (清除測試資料) */}
            {user && ADMIN_EMAILS.includes(user.email) && (
              <button onClick={handleDebugClear} className="p-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-600 h-10 w-10 flex items-center justify-center" title="清除測試資料">
                <Wrench size={20} />
              </button>
            )}

            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white border rounded-lg hover:bg-slate-50 h-10 w-10 flex items-center justify-center"><Settings size={20} /></button>
            <button onClick={handleLogout} className="p-2 bg-white border rounded-lg hover:bg-red-50 text-red-500 h-10 w-10 flex items-center justify-center" title="登出"><LogOut size={20} /></button>
            <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md font-bold transition-all h-10"><Plus size={18} /> 新增申請單</button>
          </div>
        </header>

        <div className="mb-4 bg-white p-3 rounded-xl shadow-sm flex items-center gap-3">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><Calendar size={16} /> 篩選月份</label>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-48 p-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none h-10"
          >
            <option value="all">所有月份</option>
            {monthTabs.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6 items-stretch">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="搜尋流水號、單位、廠商..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none h-12" /></div>
          <div className="flex gap-2">
            <button onClick={() => setShowUrgentOnly(!showUrgentOnly)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-all h-12 ${showUrgentOnly ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white text-slate-600 border-white shadow-sm'}`}><Flame size={18} className={showUrgentOnly?'fill-red-600':''} />{showUrgentOnly ? '只看速件' : '篩選速件'}</button>
            <div className="relative">
              <select 
                value={filterPhase} 
                onChange={(e) => setFilterPhase(e.target.value)}
                className="appearance-none bg-white border border-white text-slate-700 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold h-full"
              >
                <option value="all">顯示全部狀態</option>
                <option value="phase1">第一輪 (申請中)</option>
                <option value="phase2">第二輪 (核銷中)</option>
                <option value="phase3">第三輪 (已結案)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"><Filter size={16} /></div>
            </div>
            
            {filterPhase === 'phase3' && (
                  <button onClick={handleManageCompleted} className="flex items-center gap-2 px-5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 font-bold transition-all h-12 whitespace-nowrap"><FolderCog size={18} /> 管理結案資料</button>
            )}
            
            <button onClick={handleExportClick} className="flex items-center gap-2 px-5 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 font-bold transition-all h-12"><Download size={18} /> 匯出</button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-2xl text-center shadow-sm"><Clock className="mx-auto mb-4 text-blue-200 animate-spin" size={40} /><p className="text-slate-400 font-medium">雲端同步中...</p></div>
          ) : filteredForms.length === 0 ? (
            <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-dashed border-slate-300"><FileText className="mx-auto mb-4 text-slate-200" size={48} /><p className="text-slate-400">本月份沒有相關資料</p></div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left table-fixed">
                <thead className="bg-slate-50 text-sm text-slate-600 font-bold border-b"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4 w-32 md:w-1/6">單位/流水號</th><th className="p-4 w-1/3">採購內容/金額</th><th className="p-4 whitespace-nowrap">狀態/時間</th><th className="p-4 whitespace-nowrap">操作</th><th className="p-4 w-14"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filteredForms.map(f => <FormRow key={f.id} form={f} expandedId={expandedId} setExpandedId={setExpandedId} onAction={handleActionClick} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}