import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { logAction, LOG_TYPES } from '../logger';
import { getOperatorName } from '../utils';

export const useFormState = ({
  db, appId, user, forms, setModal,
  unitOptions, projectOptions, vendorOptions, applicantOptions, checkAndSaveNewOptions
}) => {
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
  
  // 自訂輸入狀態
  const [isCustomSubsidy, setIsCustomSubsidy] = useState(false);
  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isCustomApplicant, setIsCustomApplicant] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 計算總金額
  const totalAmount = newItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0);

  // 打包 setters 給其他 Hook (如 useBatchActions) 使用
  const formSetters = useMemo(() => ({
    setNewUnit, setNewApplicant, setNewSubsidy, setNewVendor,
    setIsUrgent, setNewGlobalRemark, setNewItems, setIsEditMode,
    setEditingFormId, setIsFormOpen
  }), []);

  // 計算可用的申請人名單
  const availableApplicants = useMemo(() => {
    if (!applicantOptions) return [];
    if (newUnit && applicantOptions[newUnit]) {
        return applicantOptions[newUnit];
    }
    return [];
  }, [newUnit, applicantOptions]);

  // 動態產生流水號
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

  // --- 表單操作事件 ---
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
      checkAndSaveNewOptions({ newUnit, newApplicant, newSubsidy, newVendor });

      const timestamp = new Date().toISOString();
      const mainSubject = newItems.map(i => i.subject).join('、');
      
      const formData = {
        unit: newUnit, applicant: newApplicant, isUrgent, globalRemark: newGlobalRemark, vendor: newVendor, applicationDate: newApplicationDate, 
        items: newItems.map(i => ({ 
            subject: i.subject, 
            quantity: parseFloat(i.quantity) || 1, 
            measureUnit: i.measureUnit || '個', 
            unitPrice: parseFloat(i.unitPrice) || 0, 
            subtotal: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0) 
        })),
        subject: mainSubject, totalPrice: totalAmount, subsidy: newSubsidy, updatedAt: serverTimestamp()
      };

      let logType, logDetail;
      if (isEditMode && editingFormId) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', editingFormId), formData);
         logType = LOG_TYPES.UPDATE; logDetail = `修改申請單：${previewSerialId} (金額: ${totalAmount})`;
      } else {
         const newSerialId = generateSerialId();
         formData.serialId = newSerialId; 
         // ★ 修改：直接將初始狀態設定為 P1_ACCOUNTING (會計室審核中)
         formData.status = 'P1_ACCOUNTING'; 
         formData.logs = [{ status: 'P1_ACCOUNTING', timestamp, note: '案件成立並送交會計室審核', operator: getOperatorName(user) }];
         formData.time_P1_ACCOUNTING = timestamp; 
         formData.createdAt = serverTimestamp();
         
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

  return {
    newUnit, setNewUnit, newApplicant, setNewApplicant,
    newSubsidy, setNewSubsidy, newVendor, setNewVendor,
    newGlobalRemark, setNewGlobalRemark, newApplicationDate, setNewApplicationDate,
    isUrgent, setIsUrgent, previewSerialId, setPreviewSerialId,
    newItems, setNewItems, isFormOpen, setIsFormOpen,
    isEditMode, setIsEditMode, editingFormId, setEditingFormId,
    isCustomSubsidy, setIsCustomSubsidy, isCustomVendor, setIsCustomVendor,
    isCustomUnit, setIsCustomUnit, isCustomApplicant, setIsCustomApplicant,
    isSubmitting, setIsSubmitting, totalAmount, availableApplicants,
    handleAddItem, handleRemoveItem, handleItemChange,
    resetForm, handleOpenCreate, handleEditClick, handleFormSubmit,
    formSetters
  };
};