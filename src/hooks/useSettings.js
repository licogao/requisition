import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { DEFAULT_UNITS, DEFAULT_PROJECTS, DEFAULT_VENDORS, DEFAULT_APPLICANTS } from '../constants';

export const useSettings = (user) => {
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNITS);
  const [projectOptions, setProjectOptions] = useState(DEFAULT_PROJECTS);
  const [vendorOptions, setVendorOptions] = useState(DEFAULT_VENDORS);
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
        
        if (data.applicants) {
            if (Array.isArray(data.applicants)) {
                setApplicantOptions({ "未分類": data.applicants });
            } else {
                setApplicantOptions(data.applicants);
            }
        } else {
            setApplicantOptions({});
        }
      } else {
        setDoc(settingsRef, { 
          units: DEFAULT_UNITS, 
          projects: DEFAULT_PROJECTS, 
          vendors: DEFAULT_VENDORS,
          applicants: {} 
        }).catch(err => {});
      }
    });

    return () => unsubscribe();
  }, [user]);
  const checkAndSaveNewOptions = async ({ newUnit, newApplicant, newSubsidy, newVendor }) => {
    const updateData = {};
    
    // 檢查單位
    const trimmedUnit = newUnit?.trim();
    if (trimmedUnit && !unitOptions.includes(trimmedUnit) && window.confirm(`是否將「${trimmedUnit}」加入常用單位？`)) {
        updateData.units = [...unitOptions, trimmedUnit];
    }

    // 檢查申請人
    const trimmedApplicant = newApplicant?.trim();
    if (trimmedUnit && trimmedApplicant) {
        const currentUnitApplicants = applicantOptions[trimmedUnit] || [];
        if (!currentUnitApplicants.includes(trimmedApplicant) && window.confirm(`是否將「${trimmedApplicant}」加入 ${trimmedUnit} 的常用名單？`)) {
            updateData.applicants = {
                ...applicantOptions,
                [trimmedUnit]: [...currentUnitApplicants, trimmedApplicant]
            };
        }
    }

    // 檢查計畫
    const trimmedSubsidy = newSubsidy?.trim();
    if (trimmedSubsidy && !projectOptions.includes(trimmedSubsidy) && trimmedSubsidy !== '無計畫 (公務)' && window.confirm(`是否將「${trimmedSubsidy}」加入常用計畫？`)) {
        updateData.projects = [...projectOptions, trimmedSubsidy];
    }
    
    // 檢查廠商
    const trimmedVendor = newVendor?.trim();
    if (trimmedVendor && !vendorOptions.includes(trimmedVendor) && window.confirm(`是否將「${trimmedVendor}」加入常用廠商？`)) {
        updateData.vendors = [...vendorOptions, trimmedVendor];
    }

    // 執行寫入
    if (Object.keys(updateData).length > 0) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'school_settings', 'config1'), updateData, { merge: true });
        } catch (e) {
            console.error("Auto-save settings failed:", e);
        }
    }
  };

  return { unitOptions, projectOptions, vendorOptions, applicantOptions, checkAndSaveNewOptions }; // 回傳新函式
};