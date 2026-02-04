export const DEFAULT_DOMAIN = '@school.admin';

export const STATUS_STEPS = {
  P1_RECEIVED: { label: '第一輪：總務處已收件', color: 'bg-blue-100 text-blue-800', nextAction: '送會計室', phase: 1 },
  P1_ACCOUNTING: { label: '第一輪：會計室審核中', color: 'bg-yellow-100 text-yellow-800', nextAction: '通知領回', phase: 1, requirePickupName: true },
  P1_RETURNED: { label: '第二輪：已領回 (待核銷)', color: 'bg-orange-100 text-orange-700', nextAction: '收到發票', phase: 2 },
  P2_RECEIVED: { label: '第二輪：收到發票/核銷單', color: 'bg-blue-100 text-blue-800', nextAction: '送經辦核銷', phase: 2 },
  P2_ACCOUNTING: { label: '第二輪：經辦核銷中', color: 'bg-yellow-100 text-yellow-800', nextAction: '全案結案', phase: 2 },
  COMPLETED: { label: '第三輪：已結案', color: 'bg-gray-800 text-white', nextAction: null, phase: 3 },
};

export const LABEL_TO_STATUS = Object.entries(STATUS_STEPS).reduce((acc, [key, val]) => {
  acc[val.label] = key;
  return acc;
}, {});

export const REVERSE_STEPS = {
  P1_ACCOUNTING: 'P1_RECEIVED',
  P1_RETURNED: 'P1_ACCOUNTING',
  P2_RECEIVED: 'P1_RETURNED',
  P2_ACCOUNTING: 'P2_RECEIVED',
  COMPLETED: 'P2_ACCOUNTING'
};

export const DEFAULT_UNITS = [];
export const DEFAULT_APPLICANTS = [];
export const DEFAULT_PROJECTS = [];
export const DEFAULT_VENDORS = [];