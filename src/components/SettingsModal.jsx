import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Settings, Layers, Briefcase, Users, AlertCircle, Edit2, Check, User, Filter, ArrowUp, ArrowDown } from 'lucide-react'; // ★ 新增 ArrowUp, ArrowDown
import { doc, updateDoc } from 'firebase/firestore';

const SettingsModal = ({ isOpen, onClose, initialData, onSave, db, appId, openAlert, openConfirm }) => {
  const [activeTab, setActiveTab] = useState('units');
  const [localData, setLocalData] = useState({ units: [], projects: [], vendors: [], applicants: {} });
  const [newItem, setNewItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedUnitForPerson, setSelectedUnitForPerson] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  // ★★★ 修正 1：每次打開視窗時，強制重置狀態，避免卡在「儲存中」 ★★★
  useEffect(() => {
    if (isOpen) {
      setIsSaving(false); // 重置儲存狀態
      setNewItem('');
      setEditingIndex(null);
      if (initialData) {
        let apps = initialData.applicantOptions || initialData.applicants || {};
        if (Array.isArray(apps)) apps = { "未分類": apps };
        setLocalData({ ...initialData, applicants: apps });

        if (initialData.units && initialData.units.length > 0) {
            setSelectedUnitForPerson(initialData.units[0]);
        }
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'units', label: '申請單位', icon: <Layers size={18} /> },
    { id: 'applicants', label: '申請人', icon: <User size={18} /> }, 
    { id: 'projects', label: '計畫來源', icon: <Briefcase size={18} /> },
    { id: 'vendors', label: '常用廠商', icon: <Users size={18} /> },
  ];

  const getCurrentList = () => {
      if (activeTab === 'applicants') {
          return localData.applicants[selectedUnitForPerson] || [];
      }
      return localData[activeTab] || [];
  };

  const updateCurrentList = (newList) => {
      if (activeTab === 'applicants') {
          setLocalData(prev => ({
              ...prev,
              applicants: {
                  ...prev.applicants,
                  [selectedUnitForPerson]: newList
              }
          }));
      } else {
          setLocalData(prev => ({
              ...prev,
              [activeTab]: newList
          }));
      }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    const currentList = getCurrentList();
    if (currentList.includes(newItem.trim())) {
        openAlert('重複項目', '該項目已存在清單中。', 'warning');
        return;
    }
    updateCurrentList([...currentList, newItem.trim()]);
    setNewItem('');
  };

  const handleDeleteItem = (itemToDelete) => {
    const currentList = getCurrentList();
    updateCurrentList(currentList.filter(item => item !== itemToDelete));
  };

  // ★★★ 2. 新增：上下移動功能 ★★★
  const handleMoveItem = (index, direction) => {
    const currentList = [...getCurrentList()];
    // 檢查邊界
    if (direction === -1 && index === 0) return; // 已經是第一個，不能上移
    if (direction === 1 && index === currentList.length - 1) return; // 已經是最後一個，不能下移

    // 交換位置
    const targetIndex = index + direction;
    [currentList[index], currentList[targetIndex]] = [currentList[targetIndex], currentList[index]];

    updateCurrentList(currentList);
  };

  const startEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const saveEdit = (index) => {
    if (!editValue.trim()) return;
    const currentList = getCurrentList();
    if (editValue.trim() === currentList[index]) { cancelEdit(); return; }
    if (currentList.filter((_, i) => i !== index).includes(editValue.trim())) {
        openAlert('重複項目', '該名稱已存在。', 'warning');
        return;
    }
    const newList = [...currentList];
    newList[index] = editValue.trim();
    updateCurrentList(newList);
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
      // 雖然 onClose 會隱藏視窗，但重置狀態以防萬一
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
              className={`flex items-center gap-2 px-6 py-4 text-base font-bold whitespace-nowrap border-b-2 transition-colors flex-1 justify-center
                ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
          
          {activeTab === 'applicants' && (
              <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <label className="block text-xs font-bold text-blue-600 mb-1 flex items-center gap-1">
                      <Filter size={12} /> 選擇所屬單位
                  </label>
                  <select 
                    value={selectedUnitForPerson} 
                    onChange={e => setSelectedUnitForPerson(e.target.value)}
                    className="w-full p-2 border border-blue-200 rounded bg-white text-base font-bold text-slate-700"
                  >
                      {localData.units.map(u => <option key={u} value={u}>{u}</option>)}
                      <option value="未分類">未分類</option>
                  </select>
              </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mb-4 shrink-0">
            <input 
              type="text" 
              value={newItem} 
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder={activeTab === 'applicants' ? `新增 ${selectedUnitForPerson} 的人員...` : `新增項目名稱...`} 
              className="flex-1 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <button 
              onClick={handleAddItem}
              disabled={!newItem.trim()}
              className="bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:transform active:scale-95 transition-all text-base"
            >
              <Plus size={20} /> 新增
            </button>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-2">
            {getCurrentList().length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[200px]">
                <AlertCircle size={32} className="opacity-20" />
                <p>目前沒有資料，請新增項目</p>
              </div>
            ) : (
              getCurrentList().map((item, index) => (
                <div key={index} className={`flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm transition-all ${editingIndex === index ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}>
                  
                  {editingIndex === index ? (
                    <div className="flex flex-1 gap-2 items-center">
                        <input 
                            type="text" 
                            value={editValue} 
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 p-1.5 border border-slate-300 rounded bg-white outline-none focus:border-blue-500 text-lg"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit(index);
                                if (e.key === 'Escape') cancelEdit();
                            }}
                        />
                        <button onClick={() => saveEdit(index)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><Check size={20} /></button>
                        <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"><X size={20} /></button>
                    </div>
                  ) : (
                    <>
                        {/* 顯示名稱 (加大字體) */}
                        <span className="font-medium text-slate-700 break-all pr-2 flex-1 text-lg">{item}</span>
                        
                        <div className="flex gap-1 shrink-0 items-center">
                            {/* ★ 上下移動按鈕 ★ */}
                            <div className="flex flex-col gap-0.5 mr-2">
                                <button 
                                    onClick={() => handleMoveItem(index, -1)}
                                    disabled={index === 0}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20"
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <button 
                                    onClick={() => handleMoveItem(index, 1)}
                                    disabled={index === getCurrentList().length - 1}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20"
                                >
                                    <ArrowDown size={16} />
                                </button>
                            </div>

                            <button 
                                onClick={() => startEdit(index, item)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="修改"
                            >
                                <Edit2 size={20} />
                            </button>
                            <button 
                                onClick={() => handleDeleteItem(item)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="移除"
                            >
                                <Trash2 size={20} />
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
            className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors text-base"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors text-base"
          >
            <Save size={20} /> {isSaving ? '儲存中...' : '儲存變更'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;