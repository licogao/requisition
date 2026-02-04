import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';

const SearchableSelect = ({ options = [], value, onChange, placeholder, onCustomClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 篩選選項
  const filteredOptions = options.filter(opt => 
    String(opt).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* 觸發按鈕 */}
      <div 
        className="w-full p-2 border border-slate-300 rounded-lg bg-white h-12 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`block truncate ${!value ? 'text-slate-400' : 'text-slate-700'}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={20} className="text-slate-400" />
      </div>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* 搜尋框 */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
              placeholder="搜尋..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto"> 
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <div
                  key={i}
                  className={`p-3 text-sm cursor-pointer hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 ${value === opt ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">無符合項目</div>
            )}
          </div>

          {/* 自訂選項按鈕 */}
          {onCustomClick && (
            <div 
              className="p-3 border-t border-slate-100 bg-slate-50 text-blue-600 text-sm font-bold cursor-pointer hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors"
              onClick={() => {
                onCustomClick(search); 
                setIsOpen(false);
              }}
            >
              <Plus size={16} /> 手動輸入{search ? `「${search}」` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;