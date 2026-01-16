import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder, onCustomClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(filter.toLowerCase()));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filter.trim()) {
        onCustomClick(filter); 
        setIsOpen(false);
        setFilter('');
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
       <div 
         onClick={() => setIsOpen(!isOpen)} 
         className="w-full px-3 border border-slate-300 rounded-lg bg-white flex justify-between items-center cursor-pointer hover:border-blue-400 transition-colors h-12"
       >
          <span className={`truncate text-base ${value ? "text-slate-800" : "text-gray-400"}`}>
            {value || placeholder}
          </span>
          <ChevronDown size={20} className="text-gray-500 ml-2" />
       </div>

       {isOpen && (
         <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
           <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
             <div className="flex items-center bg-white border border-slate-200 rounded-md px-2 focus-within:ring-2 focus-within:ring-blue-100">
               <Search size={16} className="text-gray-400 mr-2" />
               <input 
                 type="text"
                 className="w-full p-2 bg-transparent outline-none text-base placeholder-slate-400"
                 placeholder="搜尋或按 Enter 新增..."
                 value={filter}
                 onChange={(e) => setFilter(e.target.value)}
                 onKeyDown={handleKeyDown}
                 autoFocus
               />
             </div>
           </div>
           
           <div className="overflow-y-auto flex-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => (
                   <div 
                     key={idx}
                     className={`p-3 px-4 hover:bg-blue-50 cursor-pointer text-base transition-colors border-b border-slate-50 last:border-0 ${value === opt ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'}`}
                     onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                        setFilter('');
                     }}
                   >
                     {opt}
                   </div>
                ))
              ) : (
                <div className="p-4 text-gray-400 text-sm text-center italic">無符合項目，按 Enter 新增</div>
              )}
           </div>
           
           <div 
             className="p-3 border-t border-slate-100 bg-slate-50 text-blue-600 font-bold cursor-pointer hover:bg-blue-100 text-base flex items-center justify-center gap-2 transition-colors"
             onClick={() => {
               onCustomClick(filter); 
               setIsOpen(false);
               setFilter('');
             }}
           >
             <Plus size={16} /> 手動輸入其他...
           </div>
         </div>
       )}
    </div>
  );
};
export default SearchableSelect;