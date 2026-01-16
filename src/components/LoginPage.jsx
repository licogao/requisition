import React, { useState } from 'react';
import { FileText, Loader2, Lock, AlertCircle } from 'lucide-react';
import { DEFAULT_DOMAIN } from '../constants';

const LoginPage = ({ onLogin, loading, error, isPreview, onAnonymousLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                        <FileText size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">總務處申請單追蹤系統</h1>
                    <p className="text-slate-500 text-sm mt-2">請登入以繼續操作</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">帳號</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                required
                                className="w-full pl-4 pr-32 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="請輸入帳號"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 bg-slate-50 rounded-r-xl border-l border-slate-300 px-3">
                                {DEFAULT_DOMAIN}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">密碼</label>
                        <input 
                            type="password" 
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{String(error)}</span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
                        {loading ? '登入中...' : '登入系統'}
                    </button>
                    
                    {isPreview && (
                        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                             <p className="text-xs text-slate-400 mb-3">僅限預覽環境顯示</p>
                             <button 
                                type="button"
                                onClick={onAnonymousLogin}
                                disabled={loading}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all border border-slate-200"
                            >
                                預覽模式快速登入
                            </button>
                        </div>
                    )}
                </form>
                <p className="text-center text-xs text-slate-400 mt-6">
                    &copy; {new Date().getFullYear() - 1911} 總務處. All rights reserved.
                </p>
            </div>
        </div>
    );
};
export default LoginPage;