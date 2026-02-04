import React from 'react';
import { 
  ChevronDown, ChevronUp, Clock, User, Building, PlayCircle, CheckCircle, AlertCircle, ArrowRight, XCircle, RotateCcw, Edit2 
} from 'lucide-react';

const MobileFormCard = ({ form, expandedId, setExpandedId, onAction, statusSteps, selected, onSelect, canRevert }) => {
  const isExpanded = expandedId === form.id;
  const statusConfig = statusSteps?.[form.status] || {};
  
  const getStatusColor = (phase) => {
    if (phase === 1) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (phase === 2) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (phase === 3) return 'bg-slate-900 text-white border-slate-700';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (phase) => {
    if (phase === 1) return <PlayCircle size={16} />;
    if (phase === 2) return <Clock size={16} />;
    if (phase === 3) return <CheckCircle size={16} />;
    return <AlertCircle size={16} />;
  };

  const formatLocalTime = (isoString) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch (e) { return '-'; }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all duration-200 ${isExpanded ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'} ${selected ? 'bg-blue-50/30 ring-1 ring-blue-300 border-blue-300' : ''} ${form.isUrgent ? 'bg-red-50' : ''}`}>
      <div className="p-4">
        <div className="flex gap-3">
          <div className="pt-1">
             <input 
                type="checkbox" 
                checked={selected} 
                onChange={(e) => onSelect(form.id, e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
             />
          </div>

          <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {form.serialId}
                  </span>
                  {form.isUrgent && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200 animate-pulse">
                      速件
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${getStatusColor(statusConfig.phase)}`}>
                    {getStatusIcon(statusConfig.phase)}
                    {statusConfig.label}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-base leading-tight">
                  {form.subject || '無採購項目'}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building size={14} />
                  <span>{form.unit}</span>
                  <span className="text-slate-300">|</span>
                  <User size={14} />
                  <span>{form.applicant}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">總金額</div>
                  <div className="font-bold text-blue-600 text-lg">
                    ${(form.totalPrice || 0).toLocaleString()}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200 relative">
          
          <button 
               onClick={() => onAction('edit', form)}
               className="absolute top-4 right-4 p-2 bg-white text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 hover:shadow-md transition-all z-10"
               title="修改內容"
          >
             <Edit2 size={18} />
          </button>
          
          <div className="py-3 space-y-3 text-base">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
              <div>
                <span className="text-xs text-slate-400 block mb-1">申請日期</span>
                <span className="font-medium text-slate-800">{form.applicationDate ? form.applicationDate.replace(/-/g, '/') : '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">廠商</span>
                <span className="font-medium text-slate-800">{form.vendor || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">計畫來源</span>
                <span className="font-medium text-slate-800">{form.subsidy || '無'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">領回人</span>
                <span className="font-medium text-slate-800">{form.receiverName || '-'}</span>
              </div>
            </div>

            {form.globalRemark && (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-900 text-sm">
                <strong>備註：</strong> {form.globalRemark}
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">最近歷程</h4>
              <div className="space-y-2 relative pl-2 border-l-2 border-slate-200 ml-1">
                {(form.logs || []).slice().reverse().slice(0, 3).map((log, idx) => (
                  <div key={idx} className="pl-3 relative">
                    <div className="absolute -left-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-400"></div>
                    <div className="text-xs text-slate-400">{formatLocalTime(log.timestamp)}</div>
                    <div className="text-base font-medium text-slate-800">{log.note || log.status}</div>
                    <div className="text-xs text-slate-500">操作: {log.operator}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-2 pt-3 border-t border-slate-100 overflow-x-auto pb-1 no-scrollbar">
            {statusConfig.phase < 3 && (<button onClick={() => onAction('advance', form)} className="flex-[2] min-w-[120px] py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm active:bg-emerald-700 flex items-center justify-center gap-1">{statusConfig.nextAction} <ArrowRight size={16} /></button>)}
            {canRevert && (<button onClick={() => onAction('revert', form)} className="flex-1 min-w-[80px] py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold active:bg-red-50 flex items-center justify-center gap-1"><RotateCcw size={16} /> 退回</button>)}
            <button onClick={() => onAction('delete', form)} className="flex-none px-3 py-2 bg-white border border-red-200 text-red-500 rounded-lg active:bg-red-50"><XCircle size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFormCard;