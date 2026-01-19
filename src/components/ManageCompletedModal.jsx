import React from 'react';
import { Download, Trash2, X, AlertTriangle, FolderCog } from 'lucide-react';
// ★ 已移除 import { STATUS_STEPS }，完全依賴 props 傳入，確保穩定性

const ManageCompletedModal = ({ isOpen, onClose, forms, onDeleteMonth, onExport, statusSteps }) => {
  if (!isOpen) return null;

  // 1. 篩選出所有已結案的資料
  // 使用 props.statusSteps 並加上 ?. 保護
  const completedForms = forms.filter(f => statusSteps?.[f.status]?.phase === 3);

  // 2. 依照「年-月」分組
  const grouped = {};
  completedForms.forEach(f => {
    if (f.serialId) {
       const d = f.createdAt?.toDate ? f.createdAt.toDate() : new Date();
       const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
       
       if (!grouped[key]) grouped[key] = [];
       grouped[key].push(f);
    }
  });

  // 排序月份 (由新到舊)
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderCog className="text-indigo-600" /> 管理結案資料
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">定期清理舊資料以保持系統運作順暢</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
             <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
             <div className="text-sm text-blue-800">
                <strong>小提示：</strong> 建議在刪除任何月份的資料前，先執行「下載所有結案備份」以防萬一。
             </div>
          </div>

          {sortedKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-400">目前沒有結案資料</div>
          ) : (
            sortedKeys.map(monthKey => (
              <div key={monthKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm gap-3 sm:gap-0">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-lg font-mono font-bold text-slate-600">
                    {monthKey}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{grouped[monthKey].length} 筆結案資料</div>
                    <div className="text-xs text-slate-400">已歸檔</div>
                  </div>
                </div>
                <button 
                  onClick={() => onDeleteMonth(monthKey, grouped[monthKey])}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 sm:border-transparent hover:border-red-100 transition-all text-sm font-bold w-full sm:w-auto"
                  title="刪除此月份所有資料"
                >
                  <Trash2 size={18} /> 刪除
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <button 
              onClick={onExport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm order-2 sm:order-1"
            >
               <Download size={18} /> 下載所有結案備份
            </button>

            <button 
              onClick={onClose} 
              className="w-full sm:w-auto px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-md order-1 sm:order-2"
            >
              關閉
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCompletedModal;