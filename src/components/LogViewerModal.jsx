import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, Clock, User, FileText, Monitor, ArrowDownCircle } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { LOG_TYPES } from '../logger';

// 日誌類型對應的圖示與顏色
const TYPE_CONFIG = {
  [LOG_TYPES.LOGIN]: { icon: <User size={16} />, color: 'bg-green-100 text-green-700 border-green-200', label: '登入' },
  [LOG_TYPES.LOGOUT]: { icon: <User size={16} />, color: 'bg-slate-100 text-slate-600 border-slate-200', label: '登出' },
  [LOG_TYPES.CREATE]: { icon: <FileText size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-200', label: '新增' },
  [LOG_TYPES.UPDATE]: { icon: <FileText size={16} />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: '修改' },
  [LOG_TYPES.DELETE]: { icon: <X size={16} />, color: 'bg-red-100 text-red-700 border-red-200', label: '刪除' },
  [LOG_TYPES.STATUS_CHANGE]: { icon: <Activity size={16} />, color: 'bg-orange-100 text-orange-700 border-orange-200', label: '狀態' },
  [LOG_TYPES.EXPORT]: { icon: <ArrowDownCircle size={16} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '匯出' },
  [LOG_TYPES.IMPORT]: { icon: <ArrowDownCircle size={16} />, color: 'bg-teal-100 text-teal-700 border-teal-200', label: '匯入' },
  [LOG_TYPES.BATCH_DELETE]: { icon: <X size={16} />, color: 'bg-red-50 text-red-600 border-red-200', label: '批次刪除' },
  'DEFAULT': { icon: <Monitor size={16} />, color: 'bg-slate-100 text-slate-700 border-slate-200', label: '系統' }
};

const LogViewerModal = ({ isOpen, onClose, db, appId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // ★★★ 修改：將每頁筆數提高到 50，瀏覽更順暢 ★★★
  const PAGE_SIZE = 50;

  // 載入日誌
  const fetchLogs = async (isRefresh = false) => {
    if (loading) return;
    setLoading(true);
    try {
      let q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'logs'), 
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE)
      );

      if (!isRefresh && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (isRefresh) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      
      // 如果抓回來的數量少於 PAGE_SIZE，代表已經沒有更多資料了
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] md:h-[80vh]">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-slate-600" /> 系統操作日誌
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">記錄所有使用者的重要操作行為</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchLogs(true)} 
              className="p-2 hover:bg-white rounded-lg text-slate-500 border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
              title="重新整理"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={24} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 md:p-0">
          
          {/* 電腦版表格 (md:table) */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-slate-50 text-sm text-slate-600 font-bold border-b sticky top-0 shadow-sm z-10">
              <tr>
                <th className="p-4 w-48">時間</th>
                <th className="p-4 w-32">操作人員</th>
                <th className="p-4 w-32">動作類型</th>
                <th className="p-4">詳細內容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map(log => {
                const config = TYPE_CONFIG[log.action] || TYPE_CONFIG['DEFAULT'];
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-700">
                      {log.user || '未知'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {log.detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 手機版卡片清單 (md:hidden) */}
          <div className="md:hidden space-y-3 p-2">
            {logs.map(log => {
              const config = TYPE_CONFIG[log.action] || TYPE_CONFIG['DEFAULT'];
              return (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <Clock size={12} />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-snug mb-1">
                      {log.detail}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <div className="bg-slate-100 p-1 rounded-full"><User size={12} /></div>
                      <span>{log.user || '未知用戶'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {logs.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-400">
              <Activity className="mx-auto mb-2 opacity-20" size={48} />
              <p>目前沒有日誌紀錄</p>
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="p-4 text-center">
              <button 
                onClick={() => fetchLogs(false)} 
                disabled={loading}
                className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-full text-sm font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all disabled:opacity-50 w-full md:w-auto"
              >
                {loading ? '載入中...' : '載入更多紀錄'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewerModal;