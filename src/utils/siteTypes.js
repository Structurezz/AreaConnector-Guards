// Client copy of server/utils/siteTypes.js — used as a fallback so the gate
// renders with the right words before GET /api/site returns (or offline).
// Keep TERMS / DEFAULT_MODULES in step with the server.

export const TYPES = ['estate', 'school', 'university', 'hotel', 'industrial', 'hospital'];

export const TERMS = {
  estate: {
    site: 'Estate', sites: 'Estates',
    member: 'Resident', members: 'Residents',
    unit: 'Unit', units: 'Units',
    family: 'Family member', familyPlural: 'Family members', household: 'Household',
    manager: 'Estate manager', dues: 'Estate bills',
    idLabel: 'ID number', classLabel: 'Group', idCheck: 'Staff check',
  },
  school: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Class', units: 'Classes',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'School fees',
    idLabel: 'Admission / staff no.', classLabel: 'Class', idCheck: 'Staff check',
  },
  // Universities, polytechnics and colleges: adult students use the apps
  // themselves; units are hostel rooms (block = hall / hostel).
  university: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Room', units: 'Hostel rooms',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'Hostel & fees',
    idLabel: 'Matric / staff no.', classLabel: 'Department & level', idCheck: 'ID check',
    block: 'Hall',
  },
  hotel: {
    site: 'Property', sites: 'Properties',
    member: 'Guest', members: 'Guests',
    unit: 'Room', units: 'Rooms',
    family: 'Companion', familyPlural: 'Companions', household: 'Party',
    manager: 'Front desk', dues: 'Bills',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check',
  },
  industrial: {
    site: 'Site', sites: 'Sites',
    member: 'Employee', members: 'Employees',
    unit: 'Department', units: 'Departments',
    family: 'Dependant', familyPlural: 'Dependants', household: 'Team',
    manager: 'Facility manager', dues: 'Charges',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check',
  },
  hospital: {
    site: 'Hospital', sites: 'Hospitals',
    member: 'Patient / staff', members: 'Patients & staff',
    unit: 'Ward', units: 'Wards',
    family: 'Next of kin', familyPlural: 'Next of kin', household: 'Next of kin',
    manager: 'Administrator', dues: 'Bills',
    idLabel: 'Staff / patient no.', classLabel: 'Department', idCheck: 'Staff check',
  },
};

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: true, shifts: true, stays: false, visiting: false },
  university: { ...ALL_ON, household: false, gatelog: true, shifts: true, stays: false, visiting: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: true, shifts: true, stays: true, visiting: false },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: true, shifts: true, stays: false, visiting: true },
};

export const CATEGORY_INFO = {
  guest:         { label: 'Visitor' },
  pickup:        { label: 'Authorised pickup', fields: ['studentName', 'studentClass'] },
  contractor:    { label: 'Contractor',        fields: ['company', 'job', 'vehiclePlate'], induction: true },
  supplier:      { label: 'Supplier',          fields: ['company', 'goods', 'vehiclePlate'], induction: true },
  delivery:      { label: 'Delivery',          fields: ['company', 'goods', 'vehiclePlate'] },
  patient_visit: { label: 'Patient visit',     fields: ['patientName', 'ward'] },
};

export const PASS_CATEGORIES = {
  estate:     ['guest', 'delivery', 'contractor'],
  school:     ['guest', 'pickup', 'contractor', 'supplier'],
  university: ['guest', 'delivery', 'contractor', 'supplier'],
  hotel:      ['guest', 'delivery'],
  industrial: ['guest', 'contractor', 'supplier', 'delivery'],
  hospital:   ['guest', 'patient_visit', 'contractor', 'supplier', 'delivery'],
};

// Gate colours per pass category (banner + chips).
export const CATEGORY_STYLE = {
  pickup:        { bg: '#EDE9FE', fg: '#6D28D9', border: '#C4B5FD', grad: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
  contractor:    { bg: '#FFEDD5', fg: '#C2410C', border: '#FDBA74', grad: 'linear-gradient(135deg,#F97316,#C2410C)' },
  supplier:      { bg: '#FEF3C7', fg: '#B45309', border: '#FCD34D', grad: 'linear-gradient(135deg,#F59E0B,#B45309)' },
  delivery:      { bg: '#E0F2FE', fg: '#0369A1', border: '#7DD3FC', grad: 'linear-gradient(135deg,#0EA5E9,#0369A1)' },
  patient_visit: { bg: '#FCE7F3', fg: '#BE185D', border: '#F9A8D4', grad: 'linear-gradient(135deg,#EC4899,#BE185D)' },
};

export const normType = (t) => (TYPES.includes(t) ? t : 'estate');

// Config used before / without GET /api/site.
export function fallbackSite(type) {
  const t = normType(type);
  return {
    type: t,
    terms: TERMS[t],
    modules: DEFAULT_MODULES[t],
    passCategories: PASS_CATEGORIES[t].map((k) => ({ key: k, ...CATEGORY_INFO[k] })),
    relationships: null,
    inductionText: '',
    visitingHours: { start: '10:00', end: '20:00', maxPerPatient: 0 },
  };
}

// ── Local wall-clock helpers (mirror server/utils/siteClock) ──
const toMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export function inWindow(start, end, date = new Date()) {
  const a = toMin(start), b = toMin(end);
  if (a === null || b === null || a === b) return true;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

// Best-effort gate info when the server's isn't available (offline cache).
// Conservative: if the site has induction text / visiting hours, apply them.
export function localGateInfo(visitor, site) {
  if (!visitor || !site) return {};
  const info = {};
  const cat = visitor.category || 'guest';
  if (['contractor', 'supplier'].includes(cat) && site.inductionText) {
    info.induction = { required: !visitor.inductionAcceptedAt, text: site.inductionText, acceptedAt: visitor.inductionAcceptedAt || null };
  }
  if (site.modules?.visiting && ['guest', 'patient_visit'].includes(cat)) {
    const vh = site.visitingHours || {};
    info.visiting = { start: vh.start || '10:00', end: vh.end || '20:00', maxPerPatient: vh.maxPerPatient || 0, outside: !inWindow(vh.start || '10:00', vh.end || '20:00') };
  }
  return info;
}
