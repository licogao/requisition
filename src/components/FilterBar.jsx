import React from 'react';
import { Search, Loader2, Cloud, Flame, Filter, X, FolderCog, Download } from 'lucide-react';

const FilterBar = ({
  searchTerm, setSearchTerm, onCloudSearch, isSearchingCloud,
  filterMonth, setFilterMonth, monthTabs,
  showUrgentOnly, setShowUrgentOnly,
  filterVendor, setFilterVendor, vendorOptions,
  filterPhase, setFilterPhase,
  filterStartDate, setFilterStartDate,
  filterEndDate, setFilterEndDate,
  onManageCompleted, onExport
}) => {
  return (
    <div className="mb-6 bg-white p-4 rounded-xl shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="搜尋流水號、單位、採購項目..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && onCloudSearch()}
            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none h-12" 
          />
          <button 
            onClick={onCloudSearch} 
            disabled={isSearchingCloud || !searchTerm} 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" 
            title="在雲端資料庫搜尋 (不限 300 筆)"
          >
            {isSearchingCloud ? <Loader2 size={20} className="animate-spin" /> : <Cloud size={20} />}
          </button>
        </div>
        <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            className="w-full md:w-auto p-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none h-12 bg-slate-50"
          >
            <option value="all">📅 所有月份</option>
            {monthTabs.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
          <button 
            onClick={() => setShowUrgentOnly(!showUrgentOnly)} 
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border font-medium transition-all h-12 whitespace-nowrap ${showUrgentOnly ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}
          >
            <Flame size={18} className={showUrgentOnly?'fill-red-600':''} />{showUrgentOnly ? '只看速件' : '篩選速件'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 w-full md:w-auto text-sm text-slate-500 font-bold whitespace-nowrap">
          <Filter size={16} /> 進階篩選:
        </div>
        <div className="flex flex-wrap gap-2 w-full items-center">
          <select 
            value={filterVendor} 
            onChange={e => setFilterVendor(e.target.value)} 
            className="p-2 border border-slate-200 rounded-lg text-sm h-10 bg-white min-w-[120px]"
          >
            <option value="all">全部廠商</option>
            {vendorOptions.map((v, i) => <option key={i} value={v}>{v}</option>)}
          </select>

          <div className="relative">
            <select 
              value={filterPhase} 
              onChange={(e) => setFilterPhase(e.target.value)} 
              className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm h-10 font-medium"
            >
              <option value="all">全部狀態</option>
              <option value="phase1">第一輪 (申請中)</option>
              <option value="phase2">第二輪 (核銷中)</option>
              <option value="phase3">第三輪 (已結案)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500"><Filter size={12} /></div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 ml-auto md:ml-0">
            <span className="text-xs text-slate-400">範圍:</span>
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent text-sm outline-none w-28 text-slate-600" />
            <span className="text-slate-300">-</span>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent text-sm outline-none w-28 text-slate-600" />
            {(filterStartDate || filterEndDate) && (
              <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          {filterPhase === 'phase3' && (
            <button 
              onClick={onManageCompleted} 
              className="flex items-center gap-1 px-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 font-bold transition-all h-10 whitespace-nowrap text-sm"
            >
              <FolderCog size={16} /> 結案管理
            </button>
          )}
          <button 
            onClick={onExport} 
            className="flex items-center gap-1 px-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-100 font-bold transition-all h-10 whitespace-nowrap text-sm"
          >
            <Download size={16} /> 匯出
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;