import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { DEFAULT_UNITS, DEFAULT_PROJECTS, DEFAULT_VENDORS, DEFAULT_APPLICANTS } from '../constants';

export const useSettings = (user) => {
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [projectOptions, setProjectOptions] = useState(DEFAULT_PROJECTS);
  const [vendorOptions, setVendorOptions] = useState(DEFAULT_VENDORS);
  // ★ 修改：預設為物件結構 { "教務處": ["王小明"], ... }
  const [applicantOptions, setApplicantOptions] = useState({}); 

  useEffect(() => {
    if (!user) return;
    
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.units) setUnitOptions(data.units);
        if (data.projects) setProjectOptions(data.projects);
        if (data.vendors) setVendorOptions(data.vendors);
        
        // ★ 修改：處理申請人資料結構
        if (data.applicants) {
            if (Array.isArray(data.applicants)) {
                // 相容舊資料：如果是陣列，暫時歸類為 "未分類"
                setApplicantOptions({ "未分類": data.applicants });
            } else {
                // 新格式：直接使用物件
                setApplicantOptions(data.applicants);
            }
        }
      } else {
        setDoc(settingsRef, { 
          units: DEFAULT_UNITS, 
          projects: DEFAULT_PROJECTS, 
          vendors: DEFAULT_VENDORS,
          applicants: {} // 初始為空物件
        }).catch(err => {});
      }
    });

    return () => unsubscribe();
  }, [user]);

  return { unitOptions, projectOptions, vendorOptions, applicantOptions };
};