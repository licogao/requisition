import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { X, Activity, User, Clock, FileText } from 'lucide-react';
import { formatDate } from '../utils'; // 引用你現有的日期格式化工具

export default function LogViewerModal({ isOpen, onClose, db, appId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // 抓取最新的 50 筆日誌
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'system_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, db, appId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-300">
        
        {/* 標題區 */}
        <div className="flex justify-between items-center p-4 border-b bg-slate-50 rounded-t-xl">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
            <Activity className="text-blue-600" size={20} />
            系統操作日誌 (最近 50 筆)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* 內容區 (可捲動) */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">載入中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">目前沒有日誌記錄</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3 w-40 border-b"><div className="flex items-center gap-1"><Clock size={14}/> 時間</div></th>
                  <th className="p-3 w-32 border-b"><div className="flex items-center gap-1"><User size={14}/> 操作者</div></th>
                  <th className="p-3 w-24 border-b">動作</th>
                  <th className="p-3 border-b"><div className="flex items-center gap-1"><FileText size={14}/> 詳細內容</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-500 font-mono text-xs">
                      {log.timestamp?.toDate ? formatDate(log.timestamp.toDate().toISOString()) : '-'}
                    </td>
                    <td className="p-3 font-medium text-slate-700">
                      {log.operator || '未知'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.type === '刪除' || log.type === '批量刪除' ? 'bg-red-100 text-red-700' :
                        log.type === '新增' ? 'bg-green-100 text-green-700' :
                        log.type === '修改' ? 'bg-blue-100 text-blue-700' :
                        log.type === '登入' ? 'bg-slate-100 text-slate-600' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 break-all">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t bg-slate-50 rounded-b-xl text-right">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 font-medium text-sm">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}