import React from 'react';
import { Calendar } from 'lucide-react';
import { isoToMinguo } from '../utils';

const MinguoDateInput = ({ value, onChange, className = "" }) => {
    const minguoText = value ? isoToMinguo(value) : '';

    return (
        <div className={`relative w-full ${className}`}>
             <div className="flex items-center justify-between w-full px-3 border border-slate-300 rounded-lg bg-white h-12 cursor-pointer hover:border-blue-400 transition-colors group">
                <span className={`text-base font-mono ${minguoText ? 'text-slate-800' : 'text-slate-400'}`}>
                    {minguoText || '請選擇日期'}
                </span>
                <Calendar size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
             </div>
             <input 
                type="date" 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 date-full-trigger"
                style={{ opacity: 0 }} // Ensure it's invisible but clickable
              />
              <style>{`
                .date-full-trigger::-webkit-calendar-picker-indicator {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; margin: 0; padding: 0; opacity: 0; cursor: pointer;
                }
              `}</style>
        </div>
    );
};
export default MinguoDateInput;