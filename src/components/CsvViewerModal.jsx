import React, { useState, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, Search, Trash2, AlertCircle, Filter } from 'lucide-react';

// ★ 升級版：完整的 CSV 解析器 (能正確處理雙引號內的換行，避免破壞表格)
const parseCSV = (text) => {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  // 移除檔案開頭的 BOM (避免亂碼)
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // 處理連續雙引號 (跳脫字元)
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 遇到逗號且不在引號內，代表一個欄位結束
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // 遇到換行且不在引號內，代表一列結束
      if (char === '\r' && nextChar === '\n') {
        i++; // 處理 Windows 的 \r\n
      }
      currentRow.push(currentVal);
      if (currentRow.length > 1 || currentRow[0].trim() !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  // 處理最後一行沒有換行符號的情況
  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.length > 1 || currentRow[0].trim() !== '') {
        rows.push(currentRow);
    }
  }
  return rows;
};

// 定義期望的欄位排序順序
const PREFERRED_ORDER = [
  '流水號', '原申請單日期', '申請單日期', '申請日期', '建立時間', '是否速件',
  '申請單位', '申請人', '廠商', '品項名稱',
  '單價', '數量', '單位', '小計', '總金額',
  '領回人', '目前狀態', '目前狀態時間', '領回時間', '計畫補助', '計畫', '備註'
];

const CsvViewerModal = ({ isOpen, onClose }) => {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState('');

  const applicantsList = useMemo(() => {
    if (!csvData.length || !headers.includes('申請人')) return [];
    const uniqueApplicants = new Set(csvData.map(row => row['申請人']).filter(Boolean));
    return Array.from(uniqueApplicants).sort();
  }, [csvData, headers]);

  const filteredData = useMemo(() => {
    return csvData.filter(row => {
      if (selectedApplicant && row['申請人'] !== selectedApplicant) {
        return false;
      }
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchKeyword = headers.some(header => 
          String(row[header]).toLowerCase().includes(lowerTerm)
        );
        if (!matchKeyword) return false;
      }
      return true;
    });
  }, [csvData, headers, searchTerm, selectedApplicant]);

  const rowColors = useMemo(() => {
    const colors = [];
    let isBgLight = true;
    let prevSerial = null;

    filteredData.forEach((row, idx) => {
      const currentSerial = row['流水號'];
      if (idx > 0 && currentSerial !== prevSerial) {
        isBgLight = !isBgLight;
      }
      colors.push(isBgLight ? 'bg-white' : 'bg-slate-200');
      prevSerial = currentSerial;
    });
    return colors;
  }, [filteredData]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('請上傳 CSV 格式的檔案');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // 使用新的 parseCSV 一次性解析全文
        const allRows = parseCSV(text);
        
        if (allRows.length > 0) {
          // 原始表頭，用來對應資料
          const originalHeaders = allRows[0].map(h => h.trim());
          
          // 強制排序後的表頭，用來顯示
          const parsedHeaders = [...originalHeaders];
          parsedHeaders.sort((a, b) => {
            let indexA = PREFERRED_ORDER.indexOf(a);
            let indexB = PREFERRED_ORDER.indexOf(b);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            if (indexA === 999 && indexB === 999) return 0;
            return indexA - indexB;
          });

          // 組裝資料
          const parsedData = allRows.slice(1).map(rowValues => {
            return originalHeaders.reduce((obj, header, index) => {
              obj[header] = rowValues[index] !== undefined ? rowValues[index] : '';
              return obj;
            }, {});
          });

          setHeaders(parsedHeaders);
          setCsvData(parsedData);
          setFileName(file.name);
          
          setSearchTerm('');
          setSelectedApplicant('');
        }
      } catch (error) {
        console.error("CSV 解析錯誤:", error);
        alert('檔案解析失敗，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = ''; 
  };

  const handleClear = () => {
    setCsvData([]);
    setHeaders([]);
    setFileName('');
    setSearchTerm('');
    setSelectedApplicant('');
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">報表檢視器</h3>
              <p className="text-sm text-slate-500 mt-1">上傳 CSV 檔案以查閱資料</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-100/50">
          {csvData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <label className="flex flex-col items-center justify-center w-full max-w-2xl h-80 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/30 hover:bg-emerald-50 cursor-pointer transition-colors group">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={40} className="text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-emerald-700 mb-2">點擊或拖曳 CSV 報表至此處</p>
                <p className="text-sm text-slate-500">支援從系統匯出的「月報表」或「全部報表」</p>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 工具列 */}
              <div className="p-4 bg-white border-b border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 shadow-sm z-10">
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="bg-slate-100 px-3 py-1.5 rounded-lg font-mono text-sm font-bold text-slate-700 border border-slate-200 truncate max-w-[200px]" title={fileName}>
                    {fileName}
                  </div>
                  <span className="text-sm text-slate-500 font-medium whitespace-nowrap">
                    顯示 {filteredData.length} 筆
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  {applicantsList.length > 0 && (
                    <div className="relative w-full sm:w-auto">
                      <select 
                        value={selectedApplicant}
                        onChange={e => setSelectedApplicant(e.target.value)}
                        className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-all cursor-pointer"
                      >
                        <option value="">全部申請人</option>
                        {applicantsList.map(app => (
                          <option key={app} value={app}>{app}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <Filter size={14} />
                      </div>
                    </div>
                  )}

                  <div className="relative flex-1 sm:w-64 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="在報表中搜尋..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <button 
                    onClick={handleClear}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-sm transition-colors whitespace-nowrap border border-red-100 w-full sm:w-auto"
                  >
                    <Trash2 size={16} /> 移除檔案
                  </button>
                </div>
              </div>

              {/* 報表表格 */}
              <div className="flex-1 overflow-auto bg-white relative">
                {filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <AlertCircle size={40} className="mb-3 opacity-20" />
                    <p>找不到符合條件的資料</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b border-slate-300">
                      <tr>
                        <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-12 border-r border-slate-300">#</th>
                        {headers.map((header, idx) => {
                          const isNumberCol = ['單價', '數量', '小計', '總金額'].includes(header);
                          let thWidthClass = '';
                          
                          if (['建立時間', '廠商'].includes(header)) {
                            thWidthClass = 'w-[120px] min-w-[100px]';
                          } else if (['計畫補助', '計畫'].includes(header)) {
                            thWidthClass = 'w-[180px] min-w-[150px]';
                          }

                          return (
                            <th 
                              key={idx} 
                              className={`p-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-300 last:border-0 whitespace-nowrap ${isNumberCol ? 'text-right' : 'text-left'} ${thWidthClass}`}
                            >
                              {header === '小計' ? '品項小計' : header}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row, rowIdx) => {
                        // ★ 判斷是否為作廢單據
                        const isVoided = String(row['目前狀態'] || '').includes('作廢');
                        
                        // ★ 決定背景樣式：作廢統一用淺灰及淡化效果，否則維持交替色
                        const trBgClass = isVoided ? 'bg-slate-100 opacity-70' : rowColors[rowIdx];
                        
                        return (
                          <tr key={rowIdx} className={`hover:bg-emerald-50/50 transition-colors border-y border-slate-300 ${trBgClass}`}>
                            <td className={`p-3 text-center text-xs font-mono border-r border-slate-300 align-middle ${isVoided ? 'text-slate-400 line-through' : 'text-slate-400'}`}>
                              {rowIdx + 1}
                            </td>
                            {headers.map((header, colIdx) => {
                              let cellValue = row[header];
                              const isCurrency = ['單價', '小計', '總金額'].includes(header);
                              const isNumberCol = ['單價', '數量', '小計', '總金額'].includes(header);
                              
                              let tdWidthClass = 'max-w-[300px]';
                              if (['建立時間', '廠商'].includes(header)) {
                                tdWidthClass = 'max-w-[120px] w-[120px] min-w-[100px]';
                              } else if (['計畫補助', '計畫'].includes(header)) {
                                tdWidthClass = 'max-w-[200px] w-[180px] min-w-[150px]';
                              }
                              
                              // 格式化金額與文字換行
                              if (isCurrency && cellValue !== undefined && cellValue !== '') {
                                  const num = parseFloat(String(cellValue).replace(/,/g, ''));
                                  if (!isNaN(num)) {
                                      cellValue = `$${num.toLocaleString('en-US')}`;
                                  }
                              } else if (typeof cellValue === 'string') {
                                  // 將作廢原因的 \n 替換成 / 讓畫面維持單行，保持整潔
                                  cellValue = cellValue.replace(/\n/g, ' / ');
                              }

                              // ★ 根據是否作廢決定文字顏色與刪除線
                              const textColorClass = isVoided ? 'text-slate-400 line-through' : 'text-slate-700';

                              return (
                                <td 
                                  key={colIdx} 
                                  className={`p-3 text-sm border-r border-slate-300 last:border-0 whitespace-pre-wrap break-words align-middle ${isNumberCol ? 'text-right font-mono font-medium' : 'text-left'} ${tdWidthClass} ${textColorClass}`}
                                >
                                  {cellValue}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvViewerModal;