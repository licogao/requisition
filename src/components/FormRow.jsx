import React from 'react';
import { 
  ChevronRight, ChevronDown, Flame, Trash2, Edit2, FileText, Clock, RotateCcw, CheckCircle, ArrowRight 
} from 'lucide-react';
import { STATUS_STEPS, REVERSE_STEPS } from '../constants';
import { isoToMinguo, formatDate } from '../utils';

const FormRow = ({ form, expandedId, setExpandedId, onAction }) => {
    const nextAction = STATUS_STEPS[form.status]?.nextAction;
    const canRevert = REVERSE_STEPS[form.status];
    const isExpanded = expandedId === form.id;

    return (
      <React.Fragment>
        <tr className={`transition-colors cursor-pointer border-b ${form.isUrgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'} ${isExpanded ? (form.isUrgent ? 'bg-red-100' : 'bg-blue-50') : ''}`} onClick={() => setExpandedId(isExpanded ? null : form.id)}>
          <td className="p-4 text-center">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</td>
          <td className="p-4 w-32 md:w-1/6">
            <div className="flex items-center gap-1 mb-1">
              {form.isUrgent && <Flame className="w-4 h-4 text-red-500 fill-red-500" />}
              <div className={`text-xs font-mono px-1.5 py-0.5 rounded border ${form.isUrgent ? 'text-red-700 bg-red-100' : 'text-blue-600 bg-blue-50'}`}>{String(form.serialId || '')}</div>
            </div>
            <div className="font-bold truncate">{String(form.unit || '')}</div>
            <div className="text-xs text-slate-500 truncate">{String(form.applicant || '')}</div>
          </td>
          <td className="p-4 w-1/3">
            <div className="text-sm font-medium line-clamp-2">{String(form.subject || '')}</div>
            <div className="text-lg text-blue-600 font-bold mt-1">${(form.totalPrice || 0).toLocaleString()}</div>
          </td>
          <td className="p-4 whitespace-nowrap">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STEPS[form.status]?.color || 'bg-slate-100'}`}>{STATUS_STEPS[form.status]?.label || form.status}</span>
            <div className="text-sm text-slate-400 mt-2">{formatDate(form.updatedAt?.toDate ? form.updatedAt.toDate().toISOString() : '')}</div>
          </td>
          <td className="p-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2">
              {canRevert && (
                <button onClick={() => onAction('revert', form)} className="bg-red-500 text-white text-xs px-3 py-2 rounded shadow flex items-center justify-center gap-1 hover:bg-red-600"><RotateCcw size={12} />退回</button>
              )}
              {nextAction && <button onClick={() => onAction('advance', form)} className="bg-emerald-600 text-white text-xs px-3 py-2 rounded shadow flex items-center justify-center gap-1 hover:bg-emerald-700">{nextAction === '全案結案' ? <CheckCircle size={12} /> : <ArrowRight size={12} />}{nextAction}</button>}
            </div>
          </td>
          <td className="p-4 text-right w-14" onClick={e => e.stopPropagation()}><button onClick={() => onAction('delete', form)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></td>
        </tr>
        {isExpanded && (
          <tr className="bg-slate-50 border-b border-gray-200">
            <td colSpan="6" className="p-0">
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                 <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm relative">
                   <button onClick={() => onAction('edit', form)} className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors" title="修改資料"><Edit2 size={20} /></button>
                   <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FileText size={16} /> 詳細資訊</h4>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between border-b border-dashed py-1 text-xs text-slate-500"><span>狀態/急件</span><span className={form.isUrgent?'text-red-600 font-bold':'text-slate-700'}>{form.isUrgent?'🔥 急件':'一般案件'}</span></div>
                     {form.applicationDate && <div className="flex justify-between border-b border-dashed py-1"><span>申請單日期 (填單日)</span><span className="font-mono text-slate-700">{isoToMinguo(form.applicationDate)}</span></div>}
                     <div className="flex justify-between border-b border-dashed py-1"><span>申請單位</span><span className="font-medium">{String(form.unit || '')}</span></div>
                     <div className="flex justify-between border-b border-dashed py-1"><span>申請人</span><span className="font-medium">{String(form.applicant || '-')}</span></div>
                     <div className="flex justify-between border-b border-dashed py-1"><span>計畫補助</span><span className="font-medium text-orange-600">{String(form.subsidy || '無')}</span></div>
                     {form.vendor && <div className="flex justify-between border-b border-dashed py-1"><span>廠商</span><span className="font-medium text-green-600">{String(form.vendor)}</span></div>}
                     {form.receiverName && <div className="flex justify-between border-b border-dashed py-1"><span>領回人</span><span className="font-medium text-purple-600">{String(form.receiverName)}</span></div>}
                     {form.globalRemark && <div className="bg-yellow-50 p-2 rounded text-xs mt-2 border border-yellow-100"><span className="font-bold text-yellow-800">全域備註：</span>{String(form.globalRemark)}</div>}
                     <div className="mt-4"><p className="text-xs text-slate-400 mb-2">品項清單：</p><div className="bg-slate-50 rounded p-2 space-y-1">{form.items?.map((item, idx) => (<div key={idx} className="flex justify-between text-xs border-b border-slate-200 last:border-0 pb-1"><span>{idx+1}. {String(item.subject)}</span><span>{item.quantity}{item.measureUnit}x${item.unitPrice}</span></div>))}</div></div>
                     <div className="flex justify-between py-1 mt-2 pt-2 border-t"><span className="font-bold">總金額</span><span className="font-bold text-blue-600 text-lg">${(form.totalPrice || 0).toLocaleString()}</span></div>
                   </div>
                 </div>
                 <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                   <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Clock size={16} /> 歷程紀錄</h4>
                   <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-200">
                     {form.logs?.map((log, i) => (<div key={i} className="relative flex items-center group"><div className={`absolute left-0 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${log.note?.includes('退回') ? 'bg-orange-500' : 'bg-blue-500'}`}></div><div className="ml-8 text-sm"><div className={`font-medium ${log.note?.includes('退回') ? 'text-orange-600' : 'text-gray-900'}`}>{String(log.note || STATUS_STEPS[log.status]?.label || '')}</div>
                     <div className="text-gray-400 text-sm">
                        {formatDate(log.timestamp)}
                        {log.operator && <span className="ml-2 text-slate-500">({log.operator})</span>}
                     </div>
                     </div></div>))}
                   </div>
                 </div>
               </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
};
export default FormRow;