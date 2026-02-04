import React from 'react';
import { 
  Clock, PlayCircle, CheckCircle, AlertCircle, ArrowRight, RotateCcw, XCircle, Edit2, FileText, User, Building, Briefcase, Truck, CheckSquare 
} from 'lucide-react';

const isoToMinguo = (isoDateStr) => {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  return `${parseInt(parts[0]) - 1911}-${parts[1]}/${parts[2]}`; 
};

const FormRow = ({ form, expandedId, setExpandedId, onAction, selected, onSelect, statusSteps, canRevert }) => {
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

  const getValidDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatMinguoTime = (rawDate) => {
    const date = getValidDate(rawDate);
    if (!date) return '-';
    
    try {
        const year = date.getFullYear() - 1911;
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hour}:${minute}`;
    } catch (e) { return '-'; }
  };

  const getLogTextColor = (note) => {
      if (note?.includes('退回')) return 'text-red-600 font-bold';
      if (note?.includes('領回')) return 'text-purple-600 font-bold';
      return 'text-slate-900 font-medium'; 
  };

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''} ${form.isUrgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50/50'}`}>
        <td className="p-4 text-center w-12">
          <input 
            type="checkbox" 
            checked={selected} 
            onChange={(e) => onSelect(form.id, e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </td>

        <td className="p-4 align-top cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
          <div className="font-mono font-bold text-slate-700 text-base">{form.serialId}</div>
          <div className="text-xs text-slate-500 mt-1">{form.unit}</div>
          <div className="text-xs text-slate-400">{form.applicant}</div>
          {form.isUrgent && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded border border-red-200 animate-pulse">
              速件
            </span>
          )}
        </td>

        <td className="p-4 align-top cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
          <div className="font-bold text-slate-800 text-lg mb-1 line-clamp-2">{form.subject}</div>
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">預算: ${parseInt(form.totalPrice || 0).toLocaleString()}</span>
            {form.subsidy && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs border border-green-100">{form.subsidy}</span>}
          </div>
          {form.vendor && <div className="text-xs text-slate-400 mt-1">廠商: {form.vendor}</div>}
        </td>

        <td className="p-4 align-top cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
          <div className="flex flex-col gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border w-fit ${getStatusColor(statusConfig.phase)}`}>
              {getStatusIcon(statusConfig.phase)}
              {statusConfig.label}
            </span>
            <div className="text-xs text-slate-400 font-mono pl-1">
              {formatMinguoTime(form.updatedAt)}
            </div>
            {form.receiverName && (
               <div className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded w-fit border border-indigo-100">
                 領: {form.receiverName}
               </div>
            )}
          </div>
        </td>

        <td className="p-4 align-top">
          <div className="flex flex-col gap-2">
            {statusConfig.phase < 3 && (
              <button 
                onClick={(e) => { e.stopPropagation(); onAction('advance', form); }}
                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-bold shadow-sm transition-all whitespace-nowrap"
              >
                {statusConfig.nextAction} <ArrowRight size={14} />
              </button>
            )}
            
            {canRevert && (
               <button 
                 onClick={(e) => { e.stopPropagation(); onAction('revert', form); }}
                 className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 text-xs font-bold transition-all whitespace-nowrap"
               >
                 <RotateCcw size={14} /> 退回
               </button>
            )}
          </div>
        </td>

        <td className="p-4 text-center align-top">
           <div className="flex flex-col gap-2 items-center">
             <button 
                onClick={(e) => { e.stopPropagation(); onAction('delete', form); }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors" 
                title="刪除"
             >
                <XCircle size={18} />
             </button>
           </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr className={`border-b border-slate-200 ${form.isUrgent ? 'bg-red-50' : 'bg-slate-50/50'}`}>
          <td colSpan="6" className="p-0">
            <div className="flex flex-col md:flex-row">
               
               <div className="flex-1 p-6 relative">
                  <button 
                     onClick={(e) => { e.stopPropagation(); onAction('edit', form); }}
                     className="absolute top-4 right-4 p-2 bg-white text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 hover:shadow-md transition-all z-10"
                     title="編輯申請單"
                  >
                     <Edit2 size={18} />
                  </button>

                  <h4 className="font-bold text-slate-700 text-xl mb-6 flex items-center gap-2 border-b border-slate-200 pb-3">
                    <FileText size={24} className="text-blue-500" />
                    申請單詳情 
                    <span className="text-base font-normal text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono ml-2">
                        {form.serialId}
                    </span>
                  </h4>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="w-24 text-sm font-bold text-slate-500 text-right uppercase tracking-wider">申請日期</span>
                        <span className="font-mono text-slate-800 text-base font-medium bg-white px-2 py-1 rounded border border-slate-200">
                            {form.applicationDate ? isoToMinguo(form.applicationDate) : '-'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="w-24 text-sm font-bold text-slate-500 text-right uppercase tracking-wider">申請單位</span>
                        <div className="flex items-center gap-2 text-base">
                            <Building size={18} className="text-slate-400" />
                            <span className="text-slate-900 font-medium">{form.unit}</span>
                            <span className="text-slate-300">|</span>
                            <User size={18} className="text-slate-400" />
                            <span className="text-slate-900 font-medium">{form.applicant}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="w-24 text-sm font-bold text-slate-500 text-right uppercase tracking-wider">計畫補助</span>
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-base font-bold border border-green-100 flex items-center gap-1.5">
                            <Briefcase size={16} />
                            {form.subsidy || '無'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="w-24 text-sm font-bold text-slate-500 text-right uppercase tracking-wider">廠商</span>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-base font-bold border border-blue-100 flex items-center gap-1.5">
                            <Truck size={16} />
                            {form.vendor || '-'}
                        </span>
                    </div>

                    {form.receiverName && (
                        <div className="flex items-center gap-3">
                            <span className="w-24 text-sm font-bold text-slate-500 text-right uppercase tracking-wider">領回人</span>
                            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-base font-bold border border-purple-100 flex items-center gap-1.5">
                                <CheckSquare size={16} />
                                {form.receiverName}
                            </span>
                        </div>
                    )}
                  </div>

                  <div className="bg-white rounded border border-slate-200 overflow-hidden mb-4 shadow-sm">
                    <table className="w-full text-base">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-left">品項名稱</th>
                          <th className="p-3 text-right">單價</th>
                          <th className="p-3 text-center">數量</th>
                          <th className="p-3 text-right">小計</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(form.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 text-slate-800 font-medium">{item.subject}</td>
                            <td className="p-3 text-right font-mono text-slate-600">${parseInt(item.unitPrice).toLocaleString()}</td>
                            <td className="p-3 text-center text-slate-700">{item.quantity} {item.measureUnit}</td>
                            <td className="p-3 text-right font-bold text-slate-900">${parseInt(item.subtotal).toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50/50 font-bold border-t border-slate-200">
                            <td colSpan="3" className="p-3 text-right text-slate-600">總金額</td>
                            <td className="p-3 text-right text-blue-700 text-xl">${parseInt(form.totalPrice || 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {form.globalRemark && (
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-900 text-base flex gap-3 items-start">
                      <strong className="shrink-0 bg-yellow-100 px-2 py-0.5 rounded text-sm text-yellow-800">備註</strong>
                      <span className="leading-relaxed">{form.globalRemark}</span>
                    </div>
                  )}
               </div>

               <div className={`w-full md:w-1/3 border-l border-slate-200 p-6 ${form.isUrgent ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <h4 className="font-bold text-slate-600 border-b border-slate-200 pb-3 mb-5 flex items-center gap-2 text-lg">
                    <Clock size={20} /> 操作歷程
                  </h4>
                  <div className="space-y-8 relative pl-2">
                    <div className="absolute top-3 bottom-3 left-[7px] w-0.5 bg-slate-200"></div>
                    {(form.logs || []).slice().reverse().map((log, idx) => (
                      <div key={idx} className="relative pl-6">
                        <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ring-4 ${form.isUrgent ? 'ring-red-100' : 'ring-slate-50'} ${idx === 0 ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}></div>
                        
                        <div className="flex flex-col gap-1.5">
                            <span className={`text-lg font-bold font-mono tracking-tight ${idx === 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                                {formatMinguoTime(log.timestamp)}
                            </span>
                            
                            <div className={`text-base ${getLogTextColor(log.note || log.status)}`}>
                                {log.note || log.status}
                            </div>
                            
                            <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                <User size={14} />
                                {log.operator}
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default FormRow;