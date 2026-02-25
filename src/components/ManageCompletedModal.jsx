import React, { useMemo } from 'react';
import { Download, Trash2, X, AlertTriangle, FolderCog, Lock, CheckCircle2, FileSpreadsheet, FileJson } from 'lucide-react';

const ManageCompletedModal = ({ isOpen, onClose, forms, onDeleteMonth, onExport, onExportMonth, statusSteps }) => {
  
  const { sortedKeys, grouped } = useMemo(() => {
    const groups = {};

    forms.forEach(f => {
      let dateObj;
      if (f.createdAt?.toDate) {
          dateObj = f.createdAt.toDate();
      } else if (f.createdAt) {
          dateObj = new Date(f.createdAt);
      } else if (f.applicationDate) {
          dateObj = new Date(f.applicationDate);
      } else {
          dateObj = new Date();
      }

      if (isNaN(dateObj.getTime())) {
          dateObj = new Date(); 
      }

      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
      
      if (!groups[key]) {
        groups[key] = { all: [], archivable: [] };
      }
      groups[key].all.push(f);

      const phase = statusSteps?.[f.status]?.phase;
      if (phase === 3 || phase === 4) {
        groups[key].archivable.push(f);
      }
    });

    const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return { sortedKeys: keys, grouped: groups };
  }, [forms, statusSteps]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderCog className="text-indigo-600" /> 管理結案與作廢資料
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              當月份的「所有單據」皆結案或作廢後，方可解鎖刪除封存功能。
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
             <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
             <div className="text-sm text-blue-800">
                <strong>防呆機制：</strong> 為避免刪到一半的資料，系統會檢查該月份是否還有「處理中」的單據。<br/>
                <span className="text-blue-600 mt-1 block">※ 建議在刪除前，先點擊下方按鈕下載備份。</span>
             </div>
          </div>

          {sortedKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-400">目前沒有任何資料</div>
          ) : (
            sortedKeys.map(monthKey => {
              const totalCount = grouped[monthKey].all.length;
              const archivableCount = grouped[monthKey].archivable.length;
              const isUnlocked = totalCount > 0 && totalCount === archivableCount;

              return (
                <div key={monthKey} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-xl transition-all shadow-sm gap-3 sm:gap-0 ${isUnlocked ? 'border-indigo-200 hover:border-indigo-300' : 'border-slate-200 opacity-80'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg font-mono font-bold ${isUnlocked ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      {monthKey}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base">
                        {archivableCount} / {totalCount} <span className="text-sm font-medium text-slate-500">筆已準備好</span>
                      </div>
                      <div className={`text-xs font-bold mt-1 flex items-center gap-1 ${isUnlocked ? 'text-emerald-600' : 'text-orange-500'}`}>
                        {isUnlocked ? (
                          <><CheckCircle2 size={14} /> 全數可歸檔</>
                        ) : (
                          <><AlertTriangle size={14} /> 尚有 {totalCount - archivableCount} 筆未完成</>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                      onClick={() => onExportMonth(monthKey, grouped[monthKey].all, 'csv')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-bold flex-1 sm:flex-none border border-emerald-100"
                      title="下載此月份 CSV 報表"
                    >
                      <FileSpreadsheet size={16} /> CSV
                    </button>
                    <button 
                      onClick={() => onExportMonth(monthKey, grouped[monthKey].all, 'json')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors text-sm font-bold flex-1 sm:flex-none border border-blue-100"
                      title="下載此月份 JSON 備份"
                    >
                      <FileJson size={16} /> JSON
                    </button>
                    
                    {isUnlocked ? (
                      <button 
                        onClick={() => onDeleteMonth(monthKey, grouped[monthKey].archivable)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-all text-sm font-bold flex-[2] sm:flex-none shadow-sm"
                        title="刪除此月份所有資料"
                      >
                        <Trash2 size={16} /> 刪除封存
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex items-center justify-center gap-1.5 px-4 py-2 text-slate-400 bg-slate-50 rounded-lg border border-slate-200 cursor-not-allowed text-sm font-bold flex-[2] sm:flex-none"
                        title="需等該月所有單據結案或作廢後才能刪除"
                      >
                        <Lock size={16} /> 鎖定中
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-0 shrink-0">
            <button 
              onClick={onExport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm order-2 sm:order-1"
            >
               <Download size={18} /> 下載備份 (含結案與作廢)
            </button>

            <button 
              onClick={onClose} 
              className="w-full sm:w-auto px-8 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-md order-1 sm:order-2"
            >
              關閉
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCompletedModal;