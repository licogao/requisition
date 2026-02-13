import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, User, Building } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const GlobalModal = ({ modal, onClose, onConfirm, unitOptions = [], applicantOptions = {} }) => {
  const [note, setNote] = useState('');
  
  const [pickupUnit, setPickupUnit] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isCustomApplicant, setIsCustomApplicant] = useState(false);

  const availableApplicants = useMemo(() => {
    if (!applicantOptions) return [];
    if (pickupUnit && applicantOptions[pickupUnit]) {
        return applicantOptions[pickupUnit];
    }
    return [];
  }, [pickupUnit, applicantOptions]);

  // 重置狀態
  useEffect(() => {
    if (modal.isOpen) {
      setNote('');
      setPickupUnit('');
      setPickupName('');
      setIsCustomUnit(false);
      setIsCustomApplicant(false);
    }
  }, [modal.isOpen]);

  const handleConfirm = useCallback(() => {
    if (modal.showNoteInput && modal.noteRequired && !note.trim()) {
      alert('請輸入備註 / 原因');
      return;
    }
    if (modal.showPickupInput && !pickupName.trim()) {
      alert('請選擇或輸入領回人');
      return;
    }
    
    if (onConfirm) {
      onConfirm({ note, pickupName });
    }
    onClose();
  }, [modal, note, pickupName, onConfirm, onClose]);

  useEffect(() => {
    if (!modal.isOpen) return;

    const handleKeyDown = (e) => {
      // 1. ESC 關閉
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // 2. Enter 確認
      if (e.key === 'Enter') {
        const target = e.target;
        const isTextarea = target.tagName.toLowerCase() === 'textarea';
        
        if (isTextarea) {
            if (!e.ctrlKey && !e.metaKey) return; 
        }

        if (target.tagName.toLowerCase() === 'button') return;

        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modal.isOpen, handleConfirm]);

  if (!modal.isOpen) return null;

  let Icon = Info;
  let colorClass = 'text-blue-600 bg-blue-100';
  let btnClass = 'bg-blue-600 hover:bg-blue-700';

  if (modal.alertType === 'danger') {
    Icon = AlertTriangle;
    colorClass = 'text-red-600 bg-red-100';
    btnClass = 'bg-red-600 hover:bg-red-700';
  } else if (modal.alertType === 'warning') {
    Icon = AlertTriangle;
    colorClass = 'text-yellow-600 bg-yellow-100';
    btnClass = 'bg-yellow-600 hover:bg-yellow-700 text-white';
  } else if (modal.alertType === 'success') {
    Icon = CheckCircle;
    colorClass = 'text-green-600 bg-green-100';
    btnClass = 'bg-green-600 hover:bg-green-700';
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"> 
        
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${colorClass}`}>
              <Icon size={32} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-2xl font-bold text-slate-800 mb-3">{modal.title}</h3>
              <div className="text-slate-600 text-lg whitespace-pre-line mb-6 leading-relaxed">
                {modal.message}
              </div>

              {modal.showNoteInput && (
                <div className="mt-4">
                  <label className="block text-base font-bold text-slate-700 mb-2">
                    備註 / 原因 {modal.noteRequired && <span className="text-red-500">*</span>}
                    <span className="text-xs text-slate-400 font-normal ml-2">(Enter 換行, Ctrl+Enter 送出)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-4 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    rows={3}
                    placeholder="請輸入內容..."
                    autoFocus
                  />
                </div>
              )}

              {modal.showPickupInput && (
                <div className="mt-4 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="flex items-center gap-1 text-base font-bold text-slate-700 mb-2">
                        <Building size={18} /> 領回單位
                        </label>
                        {isCustomUnit ? (
                        <div className="flex gap-2">
                            <input type="text" value={pickupUnit} onChange={e => setPickupUnit(e.target.value)} placeholder="請輸入單位..." className="w-full p-3 border border-slate-300 rounded-lg h-14 text-lg outline-none focus:border-blue-500" autoFocus />
                            <button type="button" onClick={() => { setIsCustomUnit(false); setPickupUnit(''); }} className="p-2 text-gray-500 hover:bg-gray-200 bg-white border border-slate-300 rounded-lg h-14 w-14 flex items-center justify-center transition-colors"><X size={24} /></button>
                        </div>
                        ) : (
                        <div className="relative z-20">
                            <SearchableSelect options={unitOptions} value={pickupUnit} onChange={(val) => setPickupUnit(val)} placeholder="選擇或搜尋單位..." onCustomClick={(val) => { setIsCustomUnit(true); setPickupUnit(val || ''); }} />
                        </div>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center gap-1 text-base font-bold text-slate-700 mb-2">
                        <User size={18} /> 領回人 <span className="text-red-500">*</span>
                        </label>
                        {isCustomApplicant ? (
                        <div className="flex gap-2">
                            <input type="text" value={pickupName} onChange={e => setPickupName(e.target.value)} placeholder="請輸入姓名..." className="w-full p-3 border border-slate-300 rounded-lg h-14 text-lg outline-none focus:border-blue-500" autoFocus />
                            <button type="button" onClick={() => { setIsCustomApplicant(false); setPickupName(''); }} className="p-2 text-gray-500 hover:bg-gray-200 bg-white border border-slate-300 rounded-lg h-14 w-14 flex items-center justify-center transition-colors"><X size={24} /></button>
                        </div>
                        ) : (
                        <div className="relative z-20">
                            <SearchableSelect options={availableApplicants} value={pickupName} onChange={(val) => setPickupName(val)} placeholder={pickupUnit ? "選擇人員..." : "請先選單位"} onCustomClick={(val) => { setIsCustomApplicant(true); setPickupName(val || ''); }} />
                        </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 rounded-b-2xl">
           {modal.type !== 'alert' && (
              <button 
                onClick={onClose}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-lg"
              >
                取消 (Esc)
              </button>
           )}
           <button 
             onClick={handleConfirm}
             className={`px-8 py-3 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 text-lg ${btnClass}`}
           >
             確定 (Enter)
           </button>
        </div>

      </div>
    </div>
  );
};

export default GlobalModal;