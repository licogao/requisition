import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, getDoc, setDoc, onSnapshot, query, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { Plus, Search, ArrowRight, CheckCircle, Clock, FileText, ChevronRight, ChevronDown, Trash2, Building, User, Calculator, Coins, Landmark, Settings, X, Save, Download, Calendar, RotateCcw, AlertCircle, ShoppingCart, Hash, AlertTriangle, Box, Users, Flame, Filter, Edit2, Upload, LayoutGrid, List as ListIcon, Store, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

// --- Firebase Configuration (已填入您的真實設定) ---
const firebaseConfig = {
  apiKey: "AIzaSyDQ23aUdEpDYGyGFahYOUR4pgSIA2VvGFM",
  authDomain: "school-tracker-98dd9.firebaseapp.com",
  projectId: "school-tracker-98dd9",
  storageBucket: "school-tracker-98dd9.firebasestorage.app",
  messagingSenderId: "117526132618",
  appId: "1:117526132618:web:4d27295dd136461700fa73",
  measurementId: "G-X2FBLKBS9G"
};

// 這是資料庫的路徑名稱
const appId = 'school-admin-v1';

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const STATUS_STEPS = {
  P1_RECEIVED: { label: '第一輪：總務處已收件', color: 'bg-blue-100 text-blue-800', nextAction: '送會計室', phase: 1 },
  P1_ACCOUNTING: { label: '第一輪：會計室審核中', color: 'bg-yellow-100 text-yellow-800', nextAction: '通知領回', phase: 1, requirePickupName: true },
  P1_RETURNED: { label: '第一輪：已領回 (待核銷)', color: 'bg-purple-100 text-purple-800', nextAction: '收到發票', phase: 1 },
  P2_RECEIVED: { label: '第二輪：收到發票/核銷單', color: 'bg-blue-100 text-blue-800', nextAction: '送經辦核銷', phase: 2 },
  P2_ACCOUNTING: { label: '第二輪：經辦核銷中', color: 'bg-yellow-100 text-yellow-800', nextAction: '全案結案', phase: 2 },
  COMPLETED: { label: '已結案', color: 'bg-gray-800 text-white', nextAction: null, phase: 2 },
};

const REVERSE_STEPS = {
  P1_ACCOUNTING: 'P1_RECEIVED',
  P1_RETURNED: 'P1_ACCOUNTING',
  P2_RECEIVED: 'P1_RETURNED',
  P2_ACCOUNTING: 'P2_RECEIVED',
  COMPLETED: 'P2_ACCOUNTING'
};

const DEFAULT_UNITS = ['教務處', '學務處', '總務處', '輔導室', '圖書館', '校長室', '人事室', '主計室'];
const DEFAULT_PROJECTS = ['無 (公務預算)', '高中優質化', '均質化計畫', '雙語教育計畫', '數位深耕計畫', '部分辦公費'];
const DEFAULT_VENDORS = ['順發3C', '大同公司', '久大文具', '全聯福利中心', '其它廠商'];

// --- Utility Functions ---
const formatDate = (isoString) => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (e) { return '-'; }
};

const generateMonthList = () => {
  const months = [];
  const today = new Date();
  for (let i = -12; i <= 1; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    months.push({ value, label });
  }
  return months.reverse();
};

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [projectOptions, setProjectOptions] = useState(DEFAULT_PROJECTS);
  const [vendorOptions, setVendorOptions] = useState(DEFAULT_VENDORS);
  
  // View States
  const [monthTabs] = useState(generateMonthList());
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Modal State
  const [modal, setModal] = useState({
    isOpen: false, type: 'alert', title: '', message: '',
    showNoteInput: false, noteRequired: false, showPickupInput: false, onConfirm: null
  });

  // Form Input States
  const [newUnit, setNewUnit] = useState('');
  const [newApplicant, setNewApplicant] = useState('');
  const [newSubsidy, setNewSubsidy] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newGlobalRemark, setNewGlobalRemark] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [previewSerialId, setPreviewSerialId] = useState(''); 
  const [newItems, setNewItems] = useState([{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- Derived State ---
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
      if (filterPhase === 'phase2') return STATUS_STEPS[form.status]?.phase === 2 || form.status === 'P1_RETURNED';
      if (filterPhase === 'completed') return form.status === 'COMPLETED';
      if (filterPhase === 'all' && !searchTerm && filterMonth === 'all' && !showUrgentOnly) return form.status !== 'COMPLETED';
      return true;
    });
  }, [forms, searchTerm, filterPhase, filterMonth, showUrgentOnly]);

  const totalAmount = newItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    // 嘗試匿名登入
    signInAnonymously(auth)
      .then(() => {
        // 登入成功，loading 狀態會由 onAuthStateChanged 處理
      })
      .catch((error) => {
        console.error("Auth Error Detail:", error);
        setLoading(false); // 發生錯誤時停止 loading，讓使用者可以看到錯誤視窗
        
        // 針對 auth/configuration-not-found 提供詳細引導
        if (error.code === 'auth/configuration-not-found') {
          setModal({
            isOpen: true,
            type: 'alert',
            alertType: 'danger',
            title: 'Firebase 設定未完成',
            message: '偵測到 Authentication 尚未啟用。請前往 Firebase Console > Build > Authentication，點擊「Get started」，並在 Sign-in method 中啟用「Anonymous」。'
          });
        } else if (error.code === 'auth/operation-not-allowed') {
          setModal({
            isOpen: true,
            type: 'alert',
            alertType: 'danger',
            title: '登入方式未啟用',
            message: '請前往 Firebase Console > Authentication > Sign-in method，將「Anonymous」狀態設為 Enabled。'
          });
        } else {
           setModal({
            isOpen: true,
            type: 'alert',
            alertType: 'danger',
            title: '登入錯誤',
            message: `錯誤代碼: ${error.code}。請檢查 Console 日誌。`
          });
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 使用者已登入，資料載入由下一個 useEffect 處理
      } else {
        // 未登入狀態（通常由上面的錯誤處理接手，但以此保險）
        // setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
        if (a.serialId && b.serialId) return b.serialId.localeCompare(a.serialId);
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setForms(data);
      setLoading(false); // 資料載入完成
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
      // 偵測 Firestore 權限錯誤
      if (error.code === 'permission-denied') {
        setModal({
          isOpen: true,
          type: 'alert',
          alertType: 'danger',
          title: '資料庫權限不足',
          message: '請前往 Firebase Console > Firestore Database > Rules，將規則暫時改為 allow read, write: if true; (測試用)'
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.units) setUnitOptions(data.units);
        if (data.projects) setProjectOptions(data.projects);
        if (data.vendors) setVendorOptions(data.vendors);
      } else {
        setDoc(settingsRef, { units: DEFAULT_UNITS, projects: DEFAULT_PROJECTS, vendors: DEFAULT_VENDORS });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- Actions ---
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
    if (isFormOpen) setPreviewSerialId(generateSerialId());
  }, [isFormOpen, forms]);

  const handleAddItem = () => setNewItems([...newItems, { id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
  const handleRemoveItem = (index) => { if (newItems.length > 1) { const updated = [...newItems]; updated.splice(index, 1); setNewItems(updated); } };
  const handleItemChange = (index, field, value) => { const updated = [...newItems]; updated[index][field] = value; setNewItems(updated); };

  const handleAddForm = async (e) => {
    e.preventDefault();
    if (!newUnit || newItems.some(i => !i.subject.trim())) {
      openAlert('資料不完整', '請選擇申請單位並填寫品項名稱。', 'danger'); return;
    }
    try {
      const timestamp = new Date().toISOString();
      const mainSubject = newItems.map(i => i.subject).join('、');
      const newSerialId = generateSerialId();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'), {
        serialId: newSerialId, unit: newUnit, applicant: newApplicant, isUrgent, globalRemark: newGlobalRemark,
        vendor: newVendor,
        items: newItems.map(i => ({ subject: i.subject, quantity: parseInt(i.quantity) || 1, measureUnit: i.measureUnit || '個', unitPrice: parseInt(i.unitPrice) || 0, subtotal: (parseInt(i.quantity) || 0) * (parseInt(i.unitPrice) || 0) })),
        subject: mainSubject, totalPrice: totalAmount, subsidy: newSubsidy, status: 'P1_RECEIVED',
        logs: [{ status: 'P1_RECEIVED', timestamp, note: '案件成立並完成收件' }],
        time_P1_RECEIVED: timestamp, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      setNewUnit(''); setNewApplicant(''); setNewSubsidy(''); setNewGlobalRemark(''); setIsUrgent(false); setNewVendor('');
      setNewItems([{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
      setIsFormOpen(false);
      openAlert('新增成功', `已立案，流水號：${newSerialId}`);
    } catch (err) { openAlert('錯誤', '連線失敗', 'danger'); }
  };

  const advanceStatus = async (form, data = {}) => {
    let targetStatus = null;
    switch (form.status) {
      case 'P1_RECEIVED': targetStatus = 'P1_ACCOUNTING'; break;
      case 'P1_ACCOUNTING': targetStatus = 'P1_RETURNED'; break;
      case 'P1_RETURNED': targetStatus = 'P2_RECEIVED'; break;
      case 'P2_RECEIVED': targetStatus = 'P2_ACCOUNTING'; break;
      case 'P2_ACCOUNTING': targetStatus = 'COMPLETED'; break;
    }

    if (targetStatus) {
      const nextStepInfo = STATUS_STEPS[targetStatus];
      const timestamp = new Date().toISOString();
      let note = nextStepInfo.label;
      if (data.note) note += ` [備註: ${data.note}]`;
      if (data.pickupName) note += ` (領回人: ${data.pickupName})`;
      try {
        const updatePayload = {
          status: targetStatus,
          logs: [...(form.logs || []), { status: targetStatus, timestamp, note }],
          updatedAt: serverTimestamp(),
          [`time_${targetStatus}`]: timestamp
        };
        if (data.pickupName) updatePayload.receiverName = data.pickupName;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), updatePayload);
      } catch (err) { openAlert('更新失敗', '請稍後再試。', 'danger'); }
    }
  };

  const revertStatus = async (form, data = {}) => {
    const prevStatusKey = REVERSE_STEPS[form.status];
    if (prevStatusKey) {
      const timestamp = new Date().toISOString();
      const note = `退回至：${STATUS_STEPS[prevStatusKey].label} [原因: ${data.note}]`;
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), {
          status: prevStatusKey,
          logs: [...(form.logs || []), { status: prevStatusKey, timestamp, note }],
          updatedAt: serverTimestamp()
        });
      } catch (err) { openAlert('恢復失敗', '權限不足', 'danger'); }
    }
  };

  const deleteForm = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', id)); }
    catch (err) { openAlert('刪除失敗', '', 'danger'); }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split(/\r?\n/).map(row => row.split(',').map(cell => cell.replace(/"/g, '').trim()));
      
      const dataRows = rows.filter(row => {
          if (row.length < 10) return false;
          const m = parseInt(row[0]);
          const d = parseInt(row[1]);
          return !isNaN(m) && !isNaN(d) && m > 0 && m <= 12 && d > 0 && d <= 31;
      });

      if (dataRows.length === 0) { 
        openAlert('匯入失敗', 'CSV 格式不符。請確認 A欄(月), B欄(日) 為數字。', 'danger'); 
        return; 
      }

      openConfirm('舊檔匯入', `偵測到 ${dataRows.length} 筆資料，確定要匯入嗎？`, async () => {
        try {
          const batch = writeBatch(db);
          let count = 0;
          const currentYear = new Date().getFullYear();
          
          dataRows.forEach((row, index) => {
            const vMonth = String(parseInt(row[0])).padStart(2,'0');
            const vDay = String(parseInt(row[1])).padStart(2,'0');
            const appMonthRaw = parseInt(row[3]);
            const appDayRaw = parseInt(row[4]);
            const appDateStr = (!isNaN(appMonthRaw) && !isNaN(appDayRaw)) ? `${appMonthRaw}/${appDayRaw}` : '';
            const serialNo = row[6] || (index + 1);
            const unit = row[7] || '未分類';
            const subject = row[8] || '舊檔匯入';
            const rawAmount = row[9] || '0';
            const cleanAmount = parseInt(rawAmount.replace(/[$,]/g, '')) || 0;
            const vendor = row[11] || '';
            const remark = row[12];
            let globalRemark = '';
            if (remark) globalRemark += `[備註:${remark}]`;
            let timestamp = new Date().toISOString();
            const recordDate = new Date(currentYear, parseInt(row[0]) - 1, parseInt(row[1]));
            if (!isNaN(recordDate.getTime())) timestamp = recordDate.toISOString();

            const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'));
            batch.set(docRef, {
              serialId: `(${vMonth}-${vDay}-${serialNo})`,
              unit: unit,
              applicant: '舊檔資料',
              applicationDate: appDateStr,
              subject: subject,
              totalPrice: cleanAmount,
              status: 'COMPLETED',
              vendor: vendor,
              globalRemark: globalRemark.trim(),
              isUrgent: false,
              logs: [{ status: 'COMPLETED', timestamp: timestamp, note: '舊檔批次匯入存檔' }],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            count++;
          });
          
          await batch.commit();
          openAlert('匯入成功', `成功匯入 ${count} 筆資料至「已結案」區。`);
        } catch (err) { 
          openAlert('匯入錯誤', '資料格式有誤。', 'danger'); 
        }
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Modal Helpers ---
  const openAlert = (title, message, type='info') => setModal({ isOpen: true, type: 'alert', title, message, alertType: type });
  const openConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const openActionModal = (title, message, config, onConfirm) => setModal({ isOpen: true, type: 'action', title, message, showNoteInput: true, noteRequired: config.noteRequired, showPickupInput: config.showPickupInput, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const handleActionClick = (type, form) => {
    if (type === 'delete') openConfirm('確認刪除', '確定要刪除這筆紀錄嗎？此動作無法復原。', () => deleteForm(form.id));
    else if (type === 'revert') {
      const prevLabel = STATUS_STEPS[REVERSE_STEPS[form.status]]?.label;
      openActionModal('確認退回', `即將退回至「${prevLabel}」，請填寫原因。`, { noteRequired: true }, (data) => revertStatus(form, data));
    } else if (type === 'advance') {
      const step = STATUS_STEPS[form.status];
      openActionModal(`確認${step.nextAction}`, `即將進入：${step.nextAction}`, { showPickupInput: step.requirePickupName }, (data) => advanceStatus(form, data));
    }
  };

  const exportToCSV = () => {
    const headers = ['流水號', '原申請單日期', '是否速件', '申請日期', '申請單位', '申請人', '計畫補助', '廠商', '品項內容', '總金額', '領回人', '目前狀態'];
    const csvRows = filteredForms.map(f => {
      const dateStr = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : '-';
      const statusStr = STATUS_STEPS[f.status]?.label || f.status;
      return [
        f.serialId, f.applicationDate || '', f.isUrgent?'是':'否', dateStr, 
        f.unit, f.applicant, f.subsidy, f.vendor || '', 
        f.subject, f.totalPrice, f.receiverName||'', statusStr
      ].map(v => `"${String(v||'').replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `申請單報表_${new Date().toISOString().slice(0,10)}.csv`; link.click();
  };

  // --- UI Components ---
  const GlobalModal = () => {
    if (!modal.isOpen) return null;
    const [note, setNote] = useState('');
    const [pickup, setPickup] = useState('');
    const [error, setError] = useState('');
    
    // Reset inputs when modal opens
    useEffect(() => {
        if(modal.isOpen) {
            setNote('');
            setPickup('');
            setError('');
        }
    }, [modal.isOpen]);

    const handleConfirm = () => {
      if (modal.type === 'action') {
        if (modal.noteRequired && !note.trim()) { setError('請填寫原因'); return; }
        if (modal.showPickupInput && !pickup.trim()) { setError('請填寫領回人'); return; }
        modal.onConfirm({ note, pickupName: pickup });
      } else if (modal.onConfirm) { modal.onConfirm(); }
      closeModal();
    };
    
    const isDanger = modal.alertType === 'danger';
    
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border-t-4 border-blue-600" style={{borderColor: isDanger ? '#ef4444' : '#2563eb'}}>
          <div className="text-center mb-4">
            <h3 className={`text-xl font-bold ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{String(modal.title)}</h3>
            <p className="text-slate-600 mt-2 text-sm">{String(modal.message)}</p>
          </div>
          {modal.type === 'action' && (
            <div className="space-y-3 mb-4">
              {modal.showPickupInput && <input type="text" className="w-full border rounded p-2 text-sm" placeholder="* 領回人姓名" value={pickup} onChange={e => setPickup(e.target.value)} />}
              {modal.showNoteInput && <textarea className="w-full border rounded p-2 text-sm" rows="2" placeholder={modal.noteRequired ? "* 原因 (必填)" : "備註 (選填)"} value={note} onChange={e => setNote(e.target.value)} />}
              {error && <p className="text-red-500 text-xs font-bold text-center">{String(error)}</p>}
            </div>
          )}
          <div className="flex gap-2 justify-center">
            {(modal.type === 'confirm' || modal.type === 'action') && <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>}
            <button onClick={isDanger ? closeModal : handleConfirm} className={`px-6 py-2 text-white rounded-lg font-medium ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isDanger && !modal.onConfirm ? '關閉' : '確認'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SettingsModal = () => {
    const [tempUnits, setTempUnits] = useState(unitOptions);
    const [tempProjects, setTempProjects] = useState(projectOptions);
    const [tempVendors, setTempVendors] = useState(vendorOptions);
    const [newUnitInput, setNewUnitInput] = useState('');
    const [newProjectInput, setNewProjectInput] = useState('');
    const [newVendorInput, setNewVendorInput] = useState('');

    const addUnit = () => { if (newUnitInput.trim() && !tempUnits.includes(newUnitInput.trim())) { setTempUnits([...tempUnits, newUnitInput.trim()]); setNewUnitInput(''); } };
    const removeUnit = (index) => { const updated = [...tempUnits]; updated.splice(index, 1); setTempUnits(updated); };
    const addProject = () => { if (newProjectInput.trim() && !tempProjects.includes(newProjectInput.trim())) { setTempProjects([...tempProjects, newProjectInput.trim()]); setNewProjectInput(''); } };
    const removeProject = (index) => { const updated = [...tempProjects]; updated.splice(index, 1); setTempProjects(updated); };
    const addVendor = () => { if (newVendorInput.trim() && !tempVendors.includes(newVendorInput.trim())) { setTempVendors([...tempVendors, newVendorInput.trim()]); setNewVendorInput(''); } };
    const removeVendor = (index) => { const updated = [...tempVendors]; updated.splice(index, 1); setTempVendors(updated); };

    const handleSave = () => {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config'), { units: tempUnits, projects: tempProjects, vendors: tempVendors });
      setIsSettingsOpen(false);
      openAlert('設定已更新', '設定已同步至雲端。');
    };
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="w-6 h-6 text-blue-600" />共用參數設定</h3><button onClick={() => setIsSettingsOpen(false)}><X className="w-6 h-6 text-slate-400" /></button></div>
          <div className="p-6 overflow-y-auto grid md:grid-cols-3 gap-6 text-left">
             <div className="space-y-4">
               <h4 className="font-bold text-slate-700 flex items-center gap-2"><Building className="w-5 h-5 text-blue-500" /> 行政處室</h4>
               <div className="flex gap-2"><input type="text" value={newUnitInput} onChange={(e) => setNewUnitInput(e.target.value)} placeholder="新增處室..." className="flex-1 px-3 py-2 border rounded-lg text-sm" /><button onClick={addUnit} className="bg-blue-600 text-white px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /></button></div>
               <div className="bg-slate-50 border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">{tempUnits.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-slate-100 group"><span className="text-sm text-slate-700">{item}</span><button onClick={() => removeUnit(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>))}</div>
             </div>
             <div className="space-y-4">
               <h4 className="font-bold text-slate-700 flex items-center gap-2"><Landmark className="w-5 h-5 text-orange-500" /> 計畫來源</h4>
               <div className="flex gap-2"><input type="text" value={newProjectInput} onChange={(e) => setNewProjectInput(e.target.value)} placeholder="新增計畫..." className="flex-1 px-3 py-2 border rounded-lg text-sm" /><button onClick={addProject} className="bg-orange-600 text-white px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /></button></div>
               <div className="bg-slate-50 border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">{tempProjects.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-slate-100 group"><span className="text-sm text-slate-700">{item}</span><button onClick={() => removeProject(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>))}</div>
             </div>
             <div className="space-y-4">
               <h4 className="font-bold text-slate-700 flex items-center gap-2"><Store className="w-5 h-5 text-green-500" /> 合作廠商</h4>
               <div className="flex gap-2"><input type="text" value={newVendorInput} onChange={(e) => setNewVendorInput(e.target.value)} placeholder="新增廠商..." className="flex-1 px-3 py-2 border rounded-lg text-sm" /><button onClick={addVendor} className="bg-green-600 text-white px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /></button></div>
               <div className="bg-slate-50 border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">{tempVendors.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm border border-slate-100 group"><span className="text-sm text-slate-700">{item}</span><button onClick={() => removeVendor(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>))}</div>
             </div>
          </div>
          <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3"><button onClick={() => setIsSettingsOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg">取消</button><button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg flex items-center gap-2 shadow-lg"><Save className="w-5 h-5" /> 儲存並同步</button></div>
        </div>
      </div>
    );
  };

  const FormRow = ({ form }) => {
    const nextAction = STATUS_STEPS[form.status]?.nextAction;
    const canRevert = REVERSE_STEPS[form.status];
    const isExpanded = expandedId === form.id;

    return (
      <React.Fragment>
        <tr className={`transition-colors cursor-pointer border-b ${form.isUrgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'} ${isExpanded ? (form.isUrgent ? 'bg-red-100' : 'bg-blue-50') : ''}`} onClick={() => setExpandedId(isExpanded ? null : form.id)}>
          <td className="p-4 text-center">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</td>
          <td className="p-4">
            <div className="flex items-center gap-1 mb-1">
              {form.isUrgent && <Flame className="w-4 h-4 text-red-500 fill-red-500" />}
              <div className={`text-xs font-mono px-1.5 py-0.5 rounded border ${form.isUrgent ? 'text-red-700 bg-red-100' : 'text-blue-600 bg-blue-50'}`}>{String(form.serialId || '')}</div>
            </div>
            <div className="font-bold">{String(form.unit || '')}</div>
            <div className="text-xs text-slate-500">{String(form.applicant || '')}</div>
          </td>
          <td className="p-4">
            <div className="text-sm font-medium">{String(form.subject || '')}</div>
            <div className="text-xs text-blue-600 font-bold mt-1">${(form.totalPrice || 0).toLocaleString()}</div>
          </td>
          <td className="p-4">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STEPS[form.status]?.color || 'bg-slate-100'}`}>{STATUS_STEPS[form.status]?.label || form.status}</span>
            <div className="text-[10px] text-slate-400 mt-2">{formatDate(form.updatedAt?.toDate ? form.updatedAt.toDate().toISOString() : '')}</div>
          </td>
          <td className="p-4" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2">
              {canRevert && <button onClick={() => handleActionClick('revert', form)} className="p-2 border rounded hover:bg-slate-100"><RotateCcw size={14} /></button>}
              {nextAction && <button onClick={() => handleActionClick('advance', form)} className="flex-1 bg-emerald-600 text-white text-xs px-2 py-2 rounded shadow flex items-center justify-center gap-1 hover:bg-emerald-700">{nextAction === '全案結案' ? <CheckCircle size={12} /> : <ArrowRight size={12} />}{nextAction}</button>}
            </div>
          </td>
          <td className="p-4 text-right" onClick={e => e.stopPropagation()}><button onClick={() => handleActionClick('delete', form)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></td>
        </tr>
        {isExpanded && (
          <tr className="bg-slate-50 border-b border-gray-200">
            <td colSpan="6" className="p-0">
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                 <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                   <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FileText size={16} /> 詳細資訊</h4>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between border-b border-dashed py-1 text-xs text-slate-500"><span>狀態/急件</span><span className={form.isUrgent?'text-red-600 font-bold':'text-slate-700'}>{form.isUrgent?'🔥 急件':'一般案件'} <button onClick={(e)=>{e.stopPropagation(); updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id), {isUrgent: !form.isUrgent});}} className="ml-1 text-blue-600 hover:underline">切換</button></span></div>
                     {form.applicationDate && <div className="flex justify-between border-b border-dashed py-1"><span>原申請單日期</span><span className="font-mono text-slate-700">{form.applicationDate}</span></div>}
                     <div className="flex justify-between border-b border-dashed py-1"><span>申請單位</span><span className="font-medium">{String(form.unit || '')}</span></div>
                     <div className="flex justify-between border-b border-dashed py-1"><span>申請人</span><span className="font-medium">{String(form.applicant || '-')}</span></div>
                     <div className="flex justify-between border-b border-dashed py-1"><span>計畫補助</span><span className="font-medium text-orange-600">{String(form.subsidy || '無')}</span></div>
                     {form.vendor && <div className="flex justify-between border-b border-dashed py-1"><span>廠商</span><span className="font-medium text-green-600">{String(form.vendor)}</span></div>}
                     {form.receiverName && <div className="flex justify-between border-b border-dashed py-1"><span>領回人</span><span className="font-medium text-purple-600">{String(form.receiverName)}</span></div>}
                     {form.globalRemark && <div className="bg-yellow-50 p-2 rounded text-xs mt-2 border border-yellow-100"><span className="font-bold text-yellow-800">全域備註：</span>{String(form.globalRemark)}</div>}
                     <div className="mt-4"><p className="text-xs text-slate-400 mb-2">品項清單：</p><div className="bg-slate-50 rounded p-2 space-y-1">{form.items?.map((item, idx) => (<div key={idx} className="flex justify-between text-xs border-b border-slate-200 last:border-0 pb-1"><span>{idx+1}. {String(item.subject)}</span><span>{item.quantity}{item.measureUnit}x${item.unitPrice}</span></div>))}</div></div>
                     <div className="flex justify-between py-1 mt-2 pt-2 border-t"><span className="font-bold">總金額</span><span className="font-bold text-blue-600 text-lg">${(form.totalPrice || 0).toLocaleString()}</span></div>
                   </div>
                 </div>
                 <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                   <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Clock size={16} /> 歷程紀錄</h4>
                   <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-200">
                     {form.logs?.map((log, i) => (<div key={i} className="relative flex items-center group"><div className={`absolute left-0 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${log.note?.includes('退回') ? 'bg-orange-500' : 'bg-blue-500'}`}></div><div className="ml-8 text-sm"><div className={`font-medium ${log.note?.includes('退回') ? 'text-orange-600' : 'text-gray-900'}`}>{String(log.note || STATUS_STEPS[log.status]?.label || '')}</div><div className="text-gray-400 text-[10px]">{formatDate(log.timestamp)}</div></div></div>))}
                   </div>
                 </div>
               </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <GlobalModal />
      {isSettingsOpen && <SettingsModal />}
      <div className="max-w-7xl mx-auto p-4 md:p-6 text-center">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3"><div className="p-2 bg-blue-600 text-white rounded-lg"><FileText size={24} /></div><h1 className="text-xl font-bold">總務處申請單追蹤系統</h1></div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 bg-slate-50 border px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 text-sm font-medium transition-colors">
              <Upload size={16} /> 舊檔匯入 <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white border rounded-lg hover:bg-slate-50"><Settings size={20} /></button>
            <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md font-bold transition-all"><Plus size={18} /> 新增申請單</button>
          </div>
        </header>

        <div className="mb-4 bg-white p-2 rounded-xl shadow-sm flex items-center overflow-hidden">
          <button onClick={() => setFilterMonth('all')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterMonth === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>所有月份</button>
          <div className="w-[1px] h-6 bg-slate-200 mx-2"></div>
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 px-2 scroll-smooth">
            {monthTabs.map((m) => (
              <button key={m.value} onClick={() => setFilterMonth(m.value)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap font-medium transition-all ${filterMonth === m.value ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {isFormOpen && (
          <div className="mb-6 bg-white p-6 rounded-xl shadow-lg border border-blue-200 animate-in slide-in-from-top-4 duration-300 text-left">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
               <h3 className="font-bold text-lg flex items-center gap-2 text-blue-800"><Box size={20} /> 立案申請單</h3>
               <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-mono border border-blue-100">流水號預留：{previewSerialId}</div>
            </div>
            <form onSubmit={handleAddForm} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">申請單位 *</label>
                  <select value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-full p-2 border rounded-lg bg-white" required>
                    <option value="" disabled>選擇處室...</option>
                    {unitOptions.map((u, i) => <option key={i} value={u}>{String(u)}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">申請人 (選填)</label><input type="text" placeholder="姓名" value={newApplicant} onChange={e => setNewApplicant(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">計畫補助 (選填)</label><select value={newSubsidy} onChange={e => setNewSubsidy(e.target.value)} className="w-full p-2 border rounded-lg bg-white"><option value="">無計畫 (公務)</option>{projectOptions.map((p, i) => <option key={i} value={p}>{String(p)}</option>)}</select></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">廠商 (選填)</label>
                  <select value={newVendor} onChange={e => setNewVendor(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                    <option value="">選擇或輸入...</option>
                    {vendorOptions.map((v, i) => <option key={i} value={v}>{String(v)}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">案件背景備註 (選填)</label><input type="text" placeholder="時程或其他重要備註" value={newGlobalRemark} onChange={e => setNewGlobalRemark(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              
              <div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 py-2 rounded border border-red-100"><input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="w-4 h-4 text-red-600 rounded" /><span className={`text-sm font-bold ${isUrgent?'text-red-600':'text-slate-500'}`}>{isUrgent?'🔥 設定為速件':'一般案件'}</span></label></div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><ShoppingCart size={16} /> 購買項目清單</label>
                <div className="space-y-3">
                  {newItems.map((item, index) => (
                    <div key={item.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                      <span className="text-slate-300 text-[10px] w-4">{index+1}</span>
                      <input type="text" placeholder="品項名稱" value={item.subject} onChange={e => handleItemChange(index, 'subject', e.target.value)} className="flex-1 min-w-[150px] p-2 border-0 focus:ring-0 text-sm" />
                      <div className="flex gap-1">
                        <input type="number" min="1" placeholder="數" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-14 p-1 border rounded text-center text-sm" />
                        <input type="text" placeholder="位" value={item.measureUnit} onChange={e => handleItemChange(index, 'measureUnit', e.target.value)} className="w-12 p-1 border rounded text-center text-sm" />
                        <input type="number" placeholder="單價" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} className="w-20 p-1 border rounded text-center text-sm" />
                      </div>
                      <div className="text-sm font-bold text-blue-600 w-24 text-right">${((parseInt(item.quantity)||0)*(parseInt(item.unitPrice)||0)).toLocaleString()}</div>
                      <button type="button" onClick={() => handleRemoveItem(index)} className={`p-1.5 text-slate-300 hover:text-red-500 ${newItems.length===1?'invisible':''}`}><X size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200"><button type="button" onClick={handleAddItem} className="text-sm text-blue-600 flex items-center gap-1 font-bold hover:underline"><Plus size={16} /> 新增品項</button><div className="text-xl font-black">總預算: <span className="text-blue-600">${totalAmount.toLocaleString()}</span></div></div>
              </div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">取消</button><button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">確認立案</button></div>
            </form>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6 items-stretch">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="搜尋流水號、單位、廠商、備註..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="flex gap-2">
            <button onClick={() => setShowUrgentOnly(!showUrgentOnly)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-all ${showUrgentOnly ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white text-slate-600 border-white shadow-sm'}`}><Flame size={18} className={showUrgentOnly?'fill-red-600':''} />{showUrgentOnly ? '只看速件' : '篩選速件'}</button>
            <div className="relative">
              <select 
                value={filterPhase} 
                onChange={(e) => setFilterPhase(e.target.value)}
                className="appearance-none bg-white border border-white text-slate-700 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold h-full"
              >
                <option value="all">顯示全部狀態</option>
                <option value="phase1">第一輪 (申請中)</option>
                <option value="phase2">第二輪 (核銷中)</option>
                <option value="completed">已結案存檔</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"><Filter size={16} /></div>
            </div>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-5 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 font-bold transition-all"><Download size={18} /> 匯出</button>
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
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4 w-1/4">單位/流水號</th><th className="p-4 w-1/3">採購內容/金額</th><th className="p-4 w-40">狀態/時間</th><th className="p-4">操作</th><th className="p-4 w-14"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">{filteredForms.map(f => <FormRow key={f.id} form={f} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}