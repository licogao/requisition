import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { STATUS_STEPS, REVERSE_STEPS } from '../constants';
import { logAction, LOG_TYPES } from '../logger';
import { getOperatorName } from '../utils';

export const useBatchActions = ({
  db,
  appId,
  user,
  forms,
  selectedIds,
  setSelectedIds,
  setModal,
  formSetters
}) => {

  const {
    setNewUnit, setNewApplicant, setNewSubsidy, setNewVendor,
    setIsUrgent, setNewGlobalRemark, setNewItems, setIsEditMode,
    setEditingFormId, setIsFormOpen
  } = formSetters;

  // ★ 換單作廢核心邏輯 (支援單筆與合併)
  const handleVoidAndReplace = async (formsToVoid, reason) => {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      let combinedItems = [];
      const serials = formsToVoid.map(f => f.serialId).join('、');

      formsToVoid.forEach(form => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id);
          // 1. 更新舊單為作廢狀態
          batch.update(ref, {
              status: 'VOIDED',
              logs: [...(form.logs || []), { status: 'VOIDED', timestamp, note: `已作廢並換單 [原因: ${reason}]`, operator: getOperatorName(user) }],
              updatedAt: serverTimestamp(),
              time_VOIDED: timestamp
          });

          // 2. 收集所有舊單的品項，準備給新單用
          if (form.items && form.items.length > 0) {
              const itemsToAdd = form.items.map((i, idx) => ({...i, id: Date.now() + Math.random() + idx}));
              combinedItems = [...combinedItems, ...itemsToAdd];
          } else if (form.subject) {
              combinedItems.push({ id: Date.now() + Math.random(), subject: form.subject, quantity: 1, measureUnit: '式', unitPrice: form.totalPrice || 0, subtotal: form.totalPrice || 0 });
          }
      });

      try {
          // 送出作廢
          await batch.commit();
          logAction(db, appId, user, LOG_TYPES.STATUS_CHANGE, `作廢單據: ${serials} [原因: ${reason}]`);

          // 3. 預先填入新單據的資料
          const firstForm = formsToVoid[0];
          setNewUnit(firstForm.unit || '');
          setNewApplicant(firstForm.applicant || '');
          setNewSubsidy(firstForm.subsidy || '');
          setNewVendor(firstForm.vendor || '');
          setIsUrgent(formsToVoid.some(f => f.isUrgent)); // 只要有一張是速件，新單也是速件

          const existingRemark = firstForm.globalRemark ? `${firstForm.globalRemark}\n\n` : '';
          setNewGlobalRemark(`${existingRemark}※ 由舊單號 ${serials} 換單而來。\n作廢原因：${reason}`);

          if (combinedItems.length > 0) {
              setNewItems(combinedItems);
          } else {
              setNewItems([{ id: Date.now(), subject: '', quantity: 1, measureUnit: '個', unitPrice: '' }]);
          }

          // 4. 打開新增表單畫面
          setIsEditMode(false);
          setEditingFormId(null);
          setIsFormOpen(true);
          setSelectedIds(new Set()); // 清空勾選

      } catch (error) {
          console.error("Void and replace error:", error);
          setModal({ isOpen: true, type: 'alert', alertType: 'danger', title: '處理失敗', message: '無法作廢單據，請檢查網路。' });
      }
  };

  // ★ 處理底部的批量操作分配
  const handleBatchAction = (actionType) => {
    if (selectedIds.size === 0) return;
    const targets = forms.filter(f => selectedIds.has(f.id));
    if (targets.length === 0) return;

    if (actionType === 'advance') {
        const hasAccountingReviewForms = targets.some(f => STATUS_STEPS[f.status]?.label === '第一輪：會計室審核中');
        if (hasAccountingReviewForms) {
            setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '操作受限', message: '選取項目中包含「第一輪：會計室審核中」的單據。\n此階段需填寫領回人，請改用「批量領回」。' });
            return;
        }
        setModal({
            isOpen: true, type: 'action', title: `批量推進 (${targets.length} 筆)`, message: '將嘗試將選取的單據推進至下一階段。',
            onConfirm: async ({ note }) => executeBatchUpdate(targets, 'advance', note)
        });
    } else if (actionType === 'revert') {
        const validTargets = targets.filter(f => REVERSE_STEPS[f.status]);
        if (validTargets.length === 0) {
             setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '選取的單據無法退回。' });
             return;
        }
        setModal({
            isOpen: true, type: 'action', title: `批量退回 (${validTargets.length} 筆)`, message: `將退回 ${validTargets.length} 筆單據。\n請輸入退回原因：`, showNoteInput: true, noteRequired: true, alertType: 'danger',
            onConfirm: async ({ note }) => executeBatchUpdate(validTargets, 'revert', note)
        });
    } else if (actionType === 'receiver') {
        const validTargets = targets.filter(f => STATUS_STEPS[f.status]?.label === '第一輪：會計室審核中');
        if (validTargets.length === 0) {
             setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '批量領回僅適用於「會計室審核中」的單據。' });
             return;
        }
        setModal({
            isOpen: true, type: 'action', title: `批量登錄領回 (${validTargets.length} 筆)`, message: `將對 ${validTargets.length} 筆單據登錄領回人並推進。\n\n`, showPickupInput: true,
            onConfirm: async ({ pickupName }) => executeBatchUpdate(validTargets, 'receiver', null, pickupName)
        });
    } else if (actionType === 'direct_complete') {
        const validTargets = targets.filter(f => STATUS_STEPS[f.status]?.phase === 1 && f.status !== 'P2_RETURNED');
        if (validTargets.length === 0) {
            setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '此功能僅適用於「第一輪」單據。' });
            return;
        }
        setModal({
            isOpen: true, type: 'action', title: `批量直接結案 (${validTargets.length} 筆)`, message: `⚠️ 即將對 ${validTargets.length} 筆第一輪單據執行「上下核章直接結案」。`,
            onConfirm: async ({ note }) => executeBatchUpdate(validTargets, 'direct_complete', note)
        });
    } else if (actionType === 'void_and_replace') {
        const validTargets = targets.filter(f => STATUS_STEPS[f.status]?.phase !== 3 && STATUS_STEPS[f.status]?.phase !== 4);
        if (validTargets.length === 0) {
             setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無法執行', message: '勾選的單據皆已結案或作廢，無法合併。' });
             return;
        }
        setModal({
            isOpen: true, type: 'action', title: `合併換單 (${validTargets.length} 筆)`, message: `將作廢這 ${validTargets.length} 筆單據，並將其品項合併帶入新的申請單中。\n\n請輸入作廢原因 (將寫入備註)：`, showNoteInput: true, noteRequired: true, alertType: 'warning',
            onConfirm: async ({ note }) => handleVoidAndReplace(validTargets, note)
        });
    }
  };

  // ★ 執行資料庫寫入邏輯
  const executeBatchUpdate = async (targets, type, note, pickupName) => {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();
    let successCount = 0; let skipCount = 0;

    targets.forEach(form => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'school_forms', form.id);
        let updateData = null;

        if (type === 'advance') {
            const step = STATUS_STEPS[form.status];
            if (step && step.nextAction) {
                const keys = Object.keys(STATUS_STEPS);
                const idx = keys.indexOf(form.status);
                const targetStatus = (idx !== -1 && idx < keys.length - 1) ? keys[idx + 1] : null;
                if (targetStatus) {
                    updateData = {
                        status: targetStatus,
                        logs: [...(form.logs || []), { status: targetStatus, timestamp, note: note ? `${STATUS_STEPS[targetStatus].label} [批量: ${note}]` : STATUS_STEPS[targetStatus].label, operator: getOperatorName(user) }],
                        updatedAt: serverTimestamp(),
                        [`time_${targetStatus}`]: timestamp
                    };
                }
            }
        } else if (type === 'revert') {
            const prevStatusKey = REVERSE_STEPS[form.status];
            if (prevStatusKey) {
                updateData = {
                    status: prevStatusKey,
                    logs: [...(form.logs || []), { status: prevStatusKey, timestamp, note: `退回至：${STATUS_STEPS[prevStatusKey].label} [批量原因: ${note}]`, operator: getOperatorName(user) }],
                    updatedAt: serverTimestamp()
                };
            }
        } else if (type === 'receiver' && pickupName) {
            const keys = Object.keys(STATUS_STEPS);
            const idx = keys.indexOf(form.status);
            const targetStatus = (idx !== -1 && idx < keys.length - 1) ? keys[idx + 1] : null;
            if (targetStatus) {
                updateData = {
                    receiverName: pickupName, status: targetStatus,
                    logs: [...(form.logs || []), { status: targetStatus, timestamp, note: `${STATUS_STEPS[targetStatus].label} [批量領回: ${pickupName}]`, operator: getOperatorName(user) }],
                    updatedAt: serverTimestamp(), [`time_${targetStatus}`]: timestamp
                };
            }
        } else if (type === 'direct_complete') {
            const targetStatus = 'COMPLETED'; 
            updateData = {
                status: targetStatus,
                logs: [...(form.logs || []), { status: targetStatus, timestamp, note: `上下核章直接結案 [批量操作${note ? ': ' + note : ''}]`, operator: getOperatorName(user) }],
                updatedAt: serverTimestamp(), [`time_${targetStatus}`]: timestamp
            };
        }

        if (updateData) { batch.update(ref, updateData); successCount++; } else { skipCount++; }
    });

    if (successCount > 0) {
        await batch.commit();
        const logType = LOG_TYPES.STATUS_CHANGE;
        logAction(db, appId, user, logType, `批量操作 (${type}): 成功 ${successCount} 筆`);
        setModal({ isOpen: true, title: '處理完成', message: `成功更新: ${successCount} 筆\n自動略過: ${skipCount} 筆` });
    } else {
        setModal({ isOpen: true, type: 'alert', alertType: 'warning', title: '無變更', message: '沒有符合條件的單據可供更新。' });
    }
  };

  return { handleBatchAction, handleVoidAndReplace };
};