import React from 'react';
import { FileText, Upload, Activity, Wrench, Settings, LogOut, Plus } from 'lucide-react';
import { DEFAULT_DOMAIN } from '../constants';

const ADMIN_EMAILS = [`268${DEFAULT_DOMAIN}`];

const AppHeader = ({ 
  user, 
  onImportFile, 
  onOpenLog, 
  onDebugClear, 
  onOpenSettings, 
  onLogout, 
  onOpenCreate 
}) => {
  return (
    <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 text-white rounded-lg">
          <FileText size={24} />
        </div>
        <h1 className="text-xl font-bold">總務處申請單追蹤系統</h1>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center md:justify-end">
        <label className="flex items-center gap-2 bg-slate-50 border px-2 md:px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 text-xs md:text-sm font-medium transition-colors h-auto md:h-10">
          <Upload size={16} /> 匯入檔案 
          <input type="file" accept=".json" className="hidden" onChange={onImportFile} />
        </label>

        <button 
          onClick={onOpenLog} 
          className="flex items-center gap-2 bg-slate-600 text-white px-2 md:px-3 py-2 rounded-lg hover:bg-slate-700 text-xs md:text-sm font-bold transition-colors h-auto md:h-10" 
          title="查看系統日誌"
        >
          <Activity size={16} /> 日誌
        </button>

        {user && ADMIN_EMAILS.includes(user.email) && (
          <button 
            onClick={onDebugClear} 
            className="p-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-600 h-10 w-10 flex items-center justify-center" 
            title="清除測試資料"
          >
            <Wrench size={20} />
          </button>
        )}

        <button 
          onClick={onOpenSettings} 
          className="p-2 bg-white border rounded-lg hover:bg-slate-50 h-10 w-10 flex items-center justify-center"
        >
          <Settings size={20} />
        </button>

        <button 
          onClick={onLogout} 
          className="p-2 bg-white border rounded-lg hover:bg-red-50 text-red-500 h-10 w-10 flex items-center justify-center" 
          title="登出"
        >
          <LogOut size={20} />
        </button>

        <button 
          onClick={onOpenCreate} 
          className="flex items-center gap-2 bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md font-bold transition-all h-auto md:h-10 text-xs md:text-base"
        >
          <Plus size={18} /> 新增申請單
        </button>
      </div>
    </header>
  );
};

export default AppHeader;