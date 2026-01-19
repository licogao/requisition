import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { DEFAULT_UNITS, DEFAULT_PROJECTS, DEFAULT_VENDORS } from '../constants';

export const useSettings = (user) => {
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [projectOptions, setProjectOptions] = useState(DEFAULT_PROJECTS);
  const [vendorOptions, setVendorOptions] = useState(DEFAULT_VENDORS);

  useEffect(() => {
    if (!user) return;
    
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.units) setUnitOptions(data.units);
        if (data.projects) setProjectOptions(data.projects);
        if (data.vendors) setVendorOptions(data.vendors);
      } else {
        // 若設定檔不存在，自動初始化
        setDoc(settingsRef, { 
          units: DEFAULT_UNITS, 
          projects: DEFAULT_PROJECTS, 
          vendors: DEFAULT_VENDORS 
        }).catch(err => console.error("Init settings failed", err));
      }
    });

    return () => unsubscribe();
  }, [user]);

  return { unitOptions, projectOptions, vendorOptions };
};