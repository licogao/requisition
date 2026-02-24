import React from 'react';
import { Download, Trash2, X, AlertTriangle, FolderCog, FileJson, FileSpreadsheet, CheckCircle, Clock } from 'lucide-react';
import { generateCSV, downloadCSV, generateBackupJSON, downloadJSON } from '../utils';

const ManageCompletedModal = ({ isOpen, onClose, forms, onDeleteMonth, statusSteps }) => {
  if (!isOpen) return null;

  // 依照「建立時間 (年-月)」分組所有資料，計算完成度
  const grouped = {};
  forms.forEach(f => {
    if (f.serialId) {
       const d = f.createdAt?.toDate ? f.createdAt.toDate() : new Date();
       const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
       
       if (!grouped[key]) {
           grouped[key] = { total: [], completed: [] };
       }
       grouped[key].total.push(f);

       if (statusSteps?.[f.status]?.phase === 3) {
           grouped[key].completed.push(f);
       }
    }
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const handleDownload = (type, monthKey, data) => {
    const sortedData = [...data].sort((a, b) => (b.serialId || '').localeCompare(a.serialId || ''));
    const filenameStr = `${monthKey}_申請單紀錄`;
    
    if (type === 'json') {
        downloadJSON(generateBackupJSON(sortedData), `${filenameStr}_系統備份.json`);
    } else {
        downloadCSV(generateCSV(sortedData), `${filenameStr}_月報表.csv`);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh]">
        
        <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderCog className="text-indigo-600" /> 結案與封存管理
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">追蹤各月份結案進度，下載月報表並清理舊資料</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50">
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
             <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
             <div className="text-sm text-blue-800 leading-relaxed">
                <strong>安全機制：</strong> 為了避免資料遺失，必須等該月份的單據 <strong className="text-red-600">全數結案</strong> 後，刪除按鈕才會解鎖。<br/>
                刪除前，請務必先點擊 <strong>JSON 備份</strong> 下載檔案至您的 NAS 保存。
             </div>
          </div>

          {sortedKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-400">目前沒有資料</div>
          ) : (
            sortedKeys.map(monthKey => {
              const group = grouped[monthKey];
              const totalCount = group.total.length;
              const completedCount = group.completed.length;
              const isAllCompleted = totalCount > 0 && totalCount === completedCount;

              return (
                <div key={monthKey} className="flex flex-col xl:flex-row xl:items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm gap-4">
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-4 rounded-xl font-mono font-black text-slate-700 text-xl tracking-wider border border-slate-200 shadow-inner">
                      {monthKey}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base mb-1.5">當月共 {totalCount} 筆單據</div>
                      
                      {isAllCompleted ? (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 w-fit shadow-sm">
                          <CheckCircle size={16} /> 已全數結案 ({completedCount}/{totalCount})
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 w-fit shadow-sm">
                          <Clock size={16} /> 尚有未結案 ({completedCount}/{totalCount})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                      onClick={() => handleDownload('csv', monthKey, group.total)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all text-sm font-bold shadow-sm"
                      title="下載 Excel 可開的 CSV 報表"
                    >
                      <FileSpreadsheet size={18} className="text-emerald-600" /> 月報表 (CSV)
                    </button>
                    
                    <button 
                      onClick={() => handleDownload('json', monthKey, group.total)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all text-sm font-bold shadow-sm"
                      title="下載供未來還原用的 JSON 備份檔"
                    >
                      <FileJson size={18} className="text-blue-600" /> 系統備份 (JSON)
                    </button>

                    <div className="w-px h-8 bg-slate-200 hidden md:block mx-2"></div>

                    <button 
                      onClick={() => isAllCompleted && onDeleteMonth(monthKey, group.total)}
                      disabled={!isAllCompleted}
                      className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm
                        ${isAllCompleted 
                          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white cursor-pointer active:scale-95' 
                          : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed'
                        }
                      `}
                      title={isAllCompleted ? "刪除此月份所有資料" : "請等待所有單據結案後再刪除"}
                    >
                      <Trash2 size={18} /> 封存刪除
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end shrink-0">
            <button 
              onClick={onClose} 
              className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-md text-base active:scale-95"
            >
              關閉視窗
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCompletedModal;