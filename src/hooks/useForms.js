import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
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
    const formsRef = collection(db, 'artifacts', appId, 'public', 'data', 'school_forms');
    
    const activeMap = new Map();
    const recentMap = new Map();
    let initCount = 0;

    const mergeForms = () => {
      const combined = new Map([...recentMap, ...activeMap]);
      const data = Array.from(combined.values());
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        if (timeB !== timeA) return timeB - timeA;
        const idA = a.serialId || '';
        const idB = b.serialId || '';
        return idB.localeCompare(idA); 
      });
      setForms(data);
      if (initCount >= 2) setLoading(false);
    };

       const qActive = query(
      formsRef, 
      where('status', 'in', ['P1_ACCOUNTING', 'P1_RETURNED', 'P2_COMBINED'])
    );
    const unsubActive = onSnapshot(qActive, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") activeMap.delete(change.doc.id);
        else activeMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
      });
      if (initCount < 2) initCount++;
      mergeForms();
    });

    const qRecent = query(formsRef, orderBy('createdAt', 'desc'), limit(500));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") recentMap.delete(change.doc.id);
        else recentMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
      });
      if (initCount < 2) initCount++;
      mergeForms();
    });

    return () => { 
        unsubActive(); 
        unsubRecent(); 
    };
  }, [user]);

  return { forms, setForms, loading };
};