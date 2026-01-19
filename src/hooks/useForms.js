import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase';

export const useForms = (user) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setForms([]);
      return;
    }

    setLoading(true);
    
    // 預設只抓取最新的 300 筆
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'),
      orderBy('createdAt', 'desc'),
      limit(300)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setForms(prevForms => {
        // 1. 將 onSnapshot 的最新資料轉為 Map
        const snapshotForms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const combinedMap = new Map(prevForms.map(f => [f.id, f]));
        
        // 2. 處理刪除事件 (即時移除)
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            combinedMap.delete(change.doc.id);
          }
        });

        // 3. 更新或新增 snapshot 中的資料
        snapshotForms.forEach(f => combinedMap.set(f.id, f));
        
        // 4. 轉回陣列並排序
        const data = Array.from(combinedMap.values());
        data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          // 先比時間
          if (timeB !== timeA) return timeB - timeA;
          // 時間相同比流水號
          const idA = a.serialId || '';
          const idB = b.serialId || '';
          return idB.localeCompare(idA); 
        });
        return data;
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { forms, setForms, loading };
};