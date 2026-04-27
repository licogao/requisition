import React from 'react';
import { ChevronDown, ChevronUp, Clock, User, Building, PlayCircle, CheckCircle, AlertCircle, ArrowRight, XCircle, RotateCcw, Edit2, Copy } from 'lucide-react';

const MobileFormCard = ({ form, expandedId, setExpandedId, onAction, statusSteps, selected, onSelect, canRevert }) => {
  const isExpanded = expandedId === form.id;
  const statusConfig = statusSteps?.[form.status] || {};
  
  const getStatusColor = (phase) => {
    if (phase === 1) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (phase === 2) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (phase === 3) return 'bg-slate-900 text-white border-slate-700';
    if (phase === 4) return 'bg-slate-200 text-slate-500 border-slate-300';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${isExpanded ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'} ${form.isUrgent ? 'bg-red-50' : ''}`}>
      <div className="p-4" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{form.serialId}</span>
              <span className={`text-xs px-2 py-0.5 rounded border font-bold ${getStatusColor(statusConfig.phase)}`}>{statusConfig.label}</span>
            </div>
            <h3 className={`font-bold text-slate-800 ${statusConfig.phase === 4 ? 'line-through' : ''}`}>{form.subject}</h3>
          </div>
          <div className="text-right">
            <div className={`font-bold text-lg ${statusConfig.phase === 4 ? 'text-slate-400 line-through' : 'text-blue-600'}`}>
              ${parseFloat(form.totalPrice || 0).toLocaleString()}
            </div>
            {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
          <div className="flex justify-end gap-2 py-3">
              {statusConfig.phase !== 4 && (
                  <>
                     <button onClick={() => onAction('void_and_replace', form)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-bold shadow-sm"><Copy size={14} /> 換單作廢</button>
                     <button onClick={() => onAction('edit', form)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-full text-sm font-bold shadow-sm"><Edit2 size={14} /> 修改</button>
                  </>
              )}
          </div>
          <div className="flex gap-2 pt-3 border-t">
            {statusConfig.phase < 3 && <button onClick={() => onAction('advance', form)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm">{statusConfig.nextAction}</button>}
            {canRevert && <button onClick={() => onAction('revert', form)} className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold"><RotateCcw size={16} /> 退回</button>}
            <button onClick={() => onAction('delete', form)} className="px-3 py-2 text-red-500 border border-red-200 rounded-lg"><XCircle size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFormCard;