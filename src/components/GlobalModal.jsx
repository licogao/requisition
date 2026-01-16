import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const GlobalModal = ({ modal, onClose, onConfirm }) => {
    if (!modal.isOpen) return null;
    const [note, setNote] = useState('');
    const [pickup, setPickup] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const confirmBtnRef = useRef(null);
    const inputRef = useRef(null);
    
    useEffect(() => { 
        if(modal.isOpen) { 
            setNote(''); 
            setPickup(''); 
            setError(''); 
            setIsLoading(false); 
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
                else if (confirmBtnRef.current) confirmBtnRef.current.focus();
            }, 50);
        } 
    }, [modal.isOpen]);

    const handleConfirm = async () => {
      if (modal.type === 'action') {
        if (modal.noteRequired && !note.trim()) { setError('請填寫原因'); return; }
        if (modal.showPickupInput && !pickup.trim()) { setError('請填寫領回人'); return; }
      }
      
      if (onConfirm) {
          setIsLoading(true); 
          try {
              await onConfirm({ note, pickupName: pickup }); 
          } catch (e) {
              console.error("[GlobalModal] Error:", e);
          } finally {
              setIsLoading(false);
              onClose();
          }
      } else {
          onClose();
      }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            handleConfirm();
        }
    };

    const isDanger = modal.alertType === 'danger';
    
    return (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onKeyDown={(e) => { if(e.key === 'Escape') onClose(); }}> 
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border-t-4 border-blue-600" style={{borderColor: isDanger ? '#ef4444' : '#2563eb'}}>
          <div className="text-center mb-4"><h3 className={`text-xl font-bold ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{String(modal.title)}</h3>
          <p className="text-slate-600 mt-2 text-sm break-all whitespace-pre-wrap">{String(modal.message)}</p>
          </div>
          {modal.type === 'action' && (
            <div className="space-y-3 mb-4">
                {modal.showPickupInput && (<input ref={inputRef} type="text" className="w-full border rounded p-2 text-sm" placeholder="* 領回人姓名" value={pickup} onChange={e => setPickup(e.target.value)} onKeyDown={handleKeyDown} />)}
                {modal.showNoteInput && (<textarea ref={!modal.showPickupInput ? inputRef : null} className="w-full border rounded p-2 text-sm" rows="2" placeholder={modal.noteRequired ? "* 原因 (必填)" : "備註 (選填)"} value={note} onChange={e => setNote(e.target.value)} onKeyDown={handleKeyDown} />)}
                {error && <p className="text-red-500 text-xs font-bold text-center">{String(error)}</p>}
            </div>
          )}
          <div className="flex gap-2 justify-center">
            {(modal.type === 'confirm' || modal.type === 'action') && (<button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg" disabled={isLoading}>取消</button>)}
            <button 
                ref={confirmBtnRef} 
                onClick={handleConfirm}
                className={`px-6 py-2 text-white rounded-lg font-medium flex items-center gap-2 ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-70`}
                disabled={isLoading}
            >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isDanger && !modal.onConfirm ? '關閉' : '確認'}
            </button>
          </div>
        </div>
      </div>
    );
};
export default GlobalModal;