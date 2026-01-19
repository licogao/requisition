import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Settings, Layers, Briefcase, Users, AlertCircle, Edit2, Check } from 'lucide-react'; // ★ 新增 Edit2, Check
import { doc, updateDoc } from 'firebase/firestore';

const SettingsModal = ({ isOpen, onClose, initialData, onSave, db, appId, openAlert, openConfirm }) => {
  const [activeTab, setActiveTab] = useState('units');
  const [localData, setLocalData] = useState({ units: [], projects: [], vendors: [] });
  const [newItem, setNewItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // 編輯狀態
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setLocalData(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'units', label: '申請單位', icon: <Layers size={18} /> },
    { id: 'projects', label: '計畫來源', icon: <Briefcase size={18} /> },
    { id: 'vendors', label: '常用廠商', icon: <Users size={18} /> },
  ];

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    if (localData[activeTab].includes(newItem.trim())) {
      openAlert('重複項目', '該項目已存在清單中。', 'warning');
      return;
    }
    setLocalData(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newItem.trim()]
    }));
    setNewItem('');
  };

  const handleDeleteItem = (itemToDelete) => {
    setLocalData(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(item => item !== itemToDelete)
    }));
  };

  // 開始編輯
  const startEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  // 儲存編輯
  const saveEdit = (index) => {
    if (!editValue.trim()) return;
    
    // 檢查是否有變更
    const originalValue = localData[activeTab][index];
    if (editValue.trim() === originalValue) {
        cancelEdit();
        return;
    }

    // 檢查是否重複 (排除自己)
    const otherItems = localData[activeTab].filter((_, i) => i !== index);
    if (otherItems.includes(editValue.trim())) {
        openAlert('重複項目', '該名稱已存在。', 'warning');
        return;
    }

    setLocalData(prev => {
        const newList = [...prev[activeTab]];
        newList[index] = editValue.trim();
        return {
            ...prev,
            [activeTab]: newList
        };
    });
    cancelEdit();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1');
      await updateDoc(settingsRef, localData);
      onSave(localData);
      openAlert('儲存成功', '設定已更新。');
      onClose();
    } catch (error) {
      console.error("Save settings error:", error);
      openAlert('儲存失敗', '無法更新設定，請檢查網路。', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        
        <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="text-slate-600" /> 參數設定
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">管理下拉選單的預設選項</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 overflow-x-auto shrink-0 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); cancelEdit(); }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex-1 justify-center
                ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              {tab.icon} {tab.label}
              <span className="ml-1 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">
                {localData[tab.id]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-4 shrink-0">
            <input 
              type="text" 
              value={newItem} 
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder={`新增${tabs.find(t => t.id === activeTab)?.label}名稱...`} 
              className="flex-1 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleAddItem}
              disabled={!newItem.trim()}
              className="bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:transform active:scale-95 transition-all"
            >
              <Plus size={20} /> 新增
            </button>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-2">
            {localData[activeTab]?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[200px]">
                <AlertCircle size={32} className="opacity-20" />
                <p>目前沒有資料，請新增項目</p>
              </div>
            ) : (
              localData[activeTab]?.map((item, index) => (
                <div key={index} className={`flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm transition-all ${editingIndex === index ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}>
                  
                  {editingIndex === index ? (
                    /* 編輯模式 */
                    <div className="flex flex-1 gap-2 items-center">
                        <input 
                            type="text" 
                            value={editValue} 
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 p-1.5 border border-slate-300 rounded bg-white outline-none focus:border-blue-500"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit(index);
                                if (e.key === 'Escape') cancelEdit();
                            }}
                        />
                        <button onClick={() => saveEdit(index)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><Check size={18} /></button>
                        <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"><X size={18} /></button>
                    </div>
                  ) : (
                    /* 顯示模式 */
                    <>
                        <span className="font-medium text-slate-700 break-all pr-2 flex-1">{item}</span>
                        <div className="flex gap-1 shrink-0">
                            <button 
                                onClick={() => startEdit(index, item)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="修改"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteItem(item)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="移除"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Save size={18} /> {isSaving ? '儲存中...' : '儲存變更'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;