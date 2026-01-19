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
    
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'school_forms'),
      orderBy('createdAt', 'desc'),
      limit(300)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setForms(prevForms => {
        const snapshotForms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const combinedMap = new Map(prevForms.map(f => [f.id, f]));
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            combinedMap.delete(change.doc.id);
          }
        });

        snapshotForms.forEach(f => combinedMap.set(f.id, f));
        const data = Array.from(combinedMap.values());
        data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          if (timeB !== timeA) return timeB - timeA;
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