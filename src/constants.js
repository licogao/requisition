export const DEFAULT_DOMAIN = '@school.admin';

export const STATUS_STEPS = {
  P1_ACCOUNTING: { label: '第一輪：會計室審核中', color: 'bg-yellow-100 text-yellow-800', nextAction: '通知領回', phase: 1, requirePickupName: true, nextStatus: 'P1_RETURNED' },
  P1_RETURNED: { label: '第二輪：已領回 (待核銷)', color: 'bg-orange-100 text-orange-700', nextAction: '收到發票送核銷', phase: 2, nextStatus: 'P2_COMBINED' },
  P2_COMBINED: { label: '第二輪：收到發票送經辦核銷', color: 'bg-blue-100 text-blue-800', nextAction: '全案結案', phase: 2, nextStatus: 'COMPLETED' },
  COMPLETED: { label: '第三輪：已結案', color: 'bg-gray-800 text-white', nextAction: null, phase: 3, nextStatus: null },
  VOIDED: { label: '已作廢', color: 'bg-slate-200 text-slate-500', nextAction: null, phase: 4, nextStatus: null },
};

export const LABEL_TO_STATUS = Object.entries(STATUS_STEPS).reduce((acc, [key, val]) => {
  acc[val.label] = key;
  return acc;
}, {});

export const REVERSE_STEPS = {
  P1_RETURNED: 'P1_ACCOUNTING',
  P2_COMBINED: 'P1_RETURNED',
  COMPLETED: 'P2_COMBINED'
};

export const DEFAULT_UNITS = [];
export const DEFAULT_APPLICANTS = [];
export const DEFAULT_PROJECTS = [];
export const DEFAULT_VENDORS = [];