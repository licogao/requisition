import React, { useMemo } from 'react';
import { FolderCog, X, AlertCircle, FileDown, Trash2 } from 'lucide-react';
import { generateCSV, downloadCSV } from '../utils';

const ManageCompletedModal = ({ isOpen, onClose, forms, onDeleteMonth }) => {
    if (!isOpen) return null;

    // Group completed forms by month
    const groupedData = useMemo(() => {
        // Change logic: filter only where phase is 3 (COMPLETED)
        // 注意：這裡假設 forms 是從 App.jsx 傳入的原始資料，且狀態判斷由 App 決定
        // 但為了保險，這裡我們用 status === 'COMPLETED'
        const completed = forms.filter(f => f.status === 'COMPLETED');
        const groups = {};
        
        completed.forEach(f => {
            const d = f.createdAt?.toDate ? f.createdAt.toDate() : new Date();
            const y = d.getFullYear() - 1911;
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${y}年${m}月`;
            
            if (!groups[key]) {
                groups[key] = { key, count: 0, items: [] };
            }
            groups[key].count++;
            groups[key].items.push(f);
        });

        // Convert to array and sort descending by key (Year-Month)
        return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
    }, [forms]);

    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FolderCog className="w-6 h-6 text-blue-600" />
                  結案資料管理
              </h3>
              <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4 bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="font-bold mb-1">功能說明：</p>
                        <p>為避免資料量過大影響效能，建議定期備份並清除過舊的結案資料。</p>
                        <p className="mt-1 text-blue-600">※ 請務必先下載備份，資料刪除後無法復原。</p>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                     <button 
                        onClick={() => {
                            const completedForms = forms.filter(f => f.status === 'COMPLETED');
                            if (completedForms.length === 0) return alert('無資料可備份');
                            const csvContent = generateCSV(completedForms);
                            downloadCSV(csvContent, `全部結案備份_${new Date().toISOString().slice(0,10)}.csv`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-all text-sm font-bold"
                     >
                        <FileDown size={16} /> 下載所有結案備份
                     </button>
                </div>

                {groupedData.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">目前沒有結案資料</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                <th className="py-3 px-4">月份</th>
                                <th className="py-3 px-4">筆數</th>
                                <th className="py-3 px-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedData.map((group) => (
                                <tr key={group.key} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4 font-bold text-slate-700">{group.key}</td>
                                    <td className="py-3 px-4 text-slate-600">{group.count} 筆</td>
                                    <td className="py-3 px-4 text-right">
                                        <button 
                                            onClick={() => onDeleteMonth(group.key, group.items)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                        >
                                            <Trash2 size={14} /> 清除此月
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
                <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">關閉</button>
            </div>
        </div>
      </div>
    );
};
export default ManageCompletedModal;