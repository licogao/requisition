import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';

const SearchableSelect = ({ options = [], value, onChange, placeholder, onCustomClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className="w-full p-3 border border-slate-300 rounded-lg h-14 text-lg bg-white flex items-center cursor-pointer justify-between transition-colors hover:border-blue-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || placeholder}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-[3000] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-[250px] overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-colors"
                placeholder="搜尋..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          
          {onCustomClick && (
            <div 
              className="p-3 text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer border-b border-slate-100 font-bold transition-colors"
              onClick={() => {
                onCustomClick(searchTerm);
                setIsOpen(false);
                setSearchTerm('');
              }}
            >
              <Plus size={18} /> 新增自訂: {searchTerm || '...'}
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="p-3 text-slate-400 text-center text-sm">找不到符合的項目</div>
          ) : (
            filteredOptions.map(opt => (
              <div
                key={opt}
                className="p-3 hover:bg-blue-50 cursor-pointer text-slate-700 transition-colors"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;