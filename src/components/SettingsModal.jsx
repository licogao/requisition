import React, { useState } from 'react';
import { Settings, X, Building, Landmark, Store, ArrowDownAZ, Plus, Check, Trash2, Pencil, ChevronUp, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

const SettingsSection = ({ title, icon, data, fieldName, colSpan, db, appId, onUpdate, openAlert, openConfirm }) => {
    const [inputValue, setInputValue] = useState('');
    const [editState, setEditState] = useState({ index: null, value: '' });

    const updateDB = async (newData) => {
        try {
            const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1');
            await setDoc(settingsRef, { [fieldName]: newData }, { merge: true });
            if (onUpdate) onUpdate(fieldName, newData);
        } catch (err) {
            openAlert('錯誤', `操作失敗: ${err.message}`, 'danger');
        }
    };

    const handleAdd = async () => {
        const val = inputValue.trim();
        if (!val) return;
        if (data.includes(val)) {
            openAlert('提示', '此項目已存在！');
            return;
        }
        
        const newData = [val, ...data];
        await updateDB(newData);
        setInputValue(''); 
    };

    const handleRemove = async (index) => {
        openConfirm('確認刪除', `確定要刪除「${data[index]}」嗎？`, async () => {
            const newData = [...data];
            newData.splice(index, 1);
            await updateDB(newData);
        });
    };

    const handleSaveEdit = async () => {
        const val = editState.value.trim();
        if (!val) return;
        
        const newData = [...data];
        newData[editState.index] = val;
        
        await updateDB(newData);
        setEditState({ index: null, value: '' });
    };

    const handleMove = async (index, direction) => {
        const newData = [...data];
        if (direction === 'up' && index > 0) {
            [newData[index], newData[index - 1]] = [newData[index - 1], newData[index]];
        } else if (direction === 'down' && index < newData.length - 1) {
            [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
        } else {
            return;
        }
        await updateDB(newData);
    };

    const handleAutoSort = () => {
        openConfirm('自動排序', '確定要依名稱（新 -> 舊）重新排序嗎？', async () => {
             const newData = [...data].sort((a, b) => b.localeCompare(a, 'zh-Hant', { numeric: true }));
             await updateDB(newData);
        });
    };

    return (
        <div className={`space-y-4 ${colSpan}`}>
            <div className="flex justify-between items-end">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 text-lg">{icon} {title}</h4>
                <button 
                    onClick={handleAutoSort} 
                    className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-100"
                    title="自動排序 (新->舊)"
                >
                    <ArrowDownAZ size={16} /> 排序
                </button>
            </div>
            
            <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                    <input 
                        type="text" 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder={`新增${title}...`} 
                        className="w-full px-4 py-3 border rounded-lg text-base h-12" 
                    />
                </div>
                <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg shrink-0 h-12 flex items-center"><Plus className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">
                {data.map((item, idx) => {
                    const isEditing = editState.index === idx;
                    return (
                        <div key={idx} className="flex justify-between items-center bg-white px-4 py-3 rounded shadow-sm border border-slate-100 group min-h-[48px]">
                            {isEditing ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input 
                                        type="text" 
                                        value={editState.value} 
                                        onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                        className="flex-1 border rounded px-2 py-1 text-base bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none min-w-0 h-10"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-100 p-2 rounded shrink-0"><Check className="w-5 h-5" /></button>
                                    <button onClick={() => setEditState({ index: null, value: '' })} className="text-red-500 hover:bg-red-100 p-2 rounded shrink-0"><X className="w-5 h-5" /></button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-base text-slate-700 flex-1 min-w-0 break-all">{item}</span>
                                    <div className="flex gap-1 shrink-0 opacity-100"> 
                                        <div className="flex flex-col gap-0.5 mr-2">
                                            <button 
                                                onClick={() => handleMove(idx, 'up')} 
                                                disabled={idx === 0}
                                                className={`text-slate-300 hover:text-blue-500 ${idx === 0 ? 'invisible' : ''}`}
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleMove(idx, 'down')} 
                                                disabled={idx === data.length - 1}
                                                className={`text-slate-300 hover:text-blue-500 ${idx === data.length - 1 ? 'invisible' : ''}`}
                                            >
                                                <ChevronRightIcon size={14} className="rotate-90" />
                                            </button>
                                        </div>
                                        
                                        <button onClick={() => setEditState({ index: idx, value: item })} className="text-slate-400 hover:text-blue-600 p-2" title="修改"><Pencil className="w-5 h-5" /></button>
                                        <button onClick={() => handleRemove(idx)} className="text-slate-400 hover:text-red-500 p-2" title="刪除"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
                {data.length === 0 && <div className="text-sm text-gray-400 text-center py-6">暫無資料</div>}
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, initialData, db, appId, openAlert, openConfirm }) => {
    if (!isOpen) return null;
    const { units, projects, vendors } = initialData;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Settings className="w-7 h-7 text-blue-600" />共用參數設定</h3>
              <button onClick={onClose}><X className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-colors" /></button>
          </div>
          <div className="p-8 overflow-y-auto grid md:grid-cols-12 gap-8 text-left flex-1">
             <SettingsSection title="行政處室" icon={<Building className="w-6 h-6 text-blue-500" />} data={units} fieldName="units" colSpan="col-span-12 md:col-span-3" db={db} appId={appId} openAlert={openAlert} openConfirm={openConfirm} />
             <SettingsSection title="計畫來源" icon={<Landmark className="w-6 h-6 text-orange-500" />} data={projects} fieldName="projects" colSpan="col-span-12 md:col-span-5" db={db} appId={appId} openAlert={openAlert} openConfirm={openConfirm} />
             <SettingsSection title="合作廠商" icon={<Store className="w-6 h-6 text-green-500" />} data={vendors} fieldName="vendors" colSpan="col-span-12 md:col-span-4" db={db} appId={appId} openAlert={openAlert} openConfirm={openConfirm} />
          </div>
          <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <div className="flex gap-3 items-center w-full justify-end">
                <span className="text-sm text-slate-500 mr-2 font-medium">* 所有修改即時生效</span>
                <button onClick={onClose} className="px-8 py-3 bg-blue-600 text-white rounded-xl flex items-center gap-2 shadow-lg font-bold hover:bg-blue-700 transition-colors text-lg">關閉</button>
              </div>
          </div>
        </div>
      </div>
    );
};
export default SettingsModal;