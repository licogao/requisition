import React from 'react';
import { Download } from 'lucide-react';
import MinguoDateInput from './MinguoDateInput';

const ExportModal = ({ isOpen, onClose, onConfirm, mode, setMode, startDate, setStartDate, endDate, setEndDate }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-slate-800">匯出資料選項</h3>
            <p className="text-slate-500 text-sm mt-1">請選擇您要匯出的資料範圍</p>
          </div>
          <div className="space-y-4 mb-6">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input type="radio" name="exportMode" value="all" checked={mode === 'all'} onChange={() => setMode('all')} className="w-5 h-5 text-blue-600"/>
              <span className="font-bold text-slate-700 text-lg">匯出全部資料</span>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input type="radio" name="exportMode" value="completed" checked={mode === 'completed'} onChange={() => setMode('completed')} className="w-5 h-5 text-blue-600"/>
              <span className="font-bold text-slate-700 text-lg">匯出所有結案資料</span>
            </label>
            <label className="flex flex-col gap-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <div className="flex items-center gap-3"><input type="radio" name="exportMode" value="date" checked={mode === 'date'} onChange={() => setMode('date')} className="w-5 h-5 text-blue-600"/><span className="font-bold text-slate-700 text-lg">指定匯出日期區間</span></div>
              {mode === 'date' && (
                <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 w-8">從</span>
                        <MinguoDateInput value={startDate} onChange={setStartDate} className="flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 w-8">到</span>
                        <MinguoDateInput value={endDate} onChange={setEndDate} className="flex-1" />
                    </div>
                </div>
              )}
            </label>
          </div>
          <div className="flex gap-2 justify-center"><button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">取消</button><button onClick={onConfirm} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2"><Download size={20} />確認匯出</button></div>
        </div>
      </div>
    );
};
export default ExportModal;