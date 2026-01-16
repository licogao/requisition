import React, { useMemo } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
// 請確保 src/constants.js 存在
import { STATUS_STEPS } from '../constants';

const DebugClearModal = ({ isOpen, onClose, forms, onDeleteMonth }) => {
    if (!isOpen) return null;

    // 將所有「非結案 (Phase 1 & 2)」的資料按月份分組
    const groupedData = useMemo(() => {
        // 安全檢查
        if (!forms) return [];

        const activeForms = forms.filter(f => {
             // 若 STATUS_STEPS 未載入，避免崩潰
            if (!STATUS_STEPS) return false;
            const step = STATUS_STEPS[f.status];
            // 若狀態未定義但非 COMPLETED，視為未結案；若有定義則看 phase
            if (!step) return f.status !== 'COMPLETED';
            return step.phase !== 3; 
        });

        const groups = {};
        
        activeForms.forEach(f => {
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

        // 依月份倒序排列
        return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
    }, [forms]);

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border-4 border-red-500 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-red-50 shrink-0 z-10 relative">
              <h3 className="text-xl font-black text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  強制清除進行中資料 (測試用)
              </h3>
              <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>

            {/* Warning */}
            <div className="p-6 pb-0 shrink-0 bg-white z-10 relative">
                <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800 border border-red-200 shadow-sm">
                    <p className="font-bold mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} /> 
                        危險操作警告：
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                        <li>此功能專門清除卡在<b>「第一輪」或「第二輪」</b>的測試資料。</li>
                        <li>刪除後<b>無法復原</b>，請確保您知道自己在做什麼。</li>
                    </ul>
                </div>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
                {groupedData.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">目前沒有進行中的資料</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-0">
                            <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                <th className="py-3 px-4">月份</th>
                                <th className="py-3 px-4">筆數 (未結案)</th>
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold shadow-sm"
                                        >
                                            <Trash2 size={14} /> 強制刪除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-slate-50 flex justify-end shrink-0">
                <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">關閉</button>
            </div>
        </div>
      </div>
    );
};
export default DebugClearModal;