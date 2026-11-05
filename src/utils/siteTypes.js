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
    member: 'Patient or staff member', members: 'Patients & staff',
    unit: 'Ward', units: 'Wards',
    family: 'Next of kin', familyPlural: 'Next of kin', household: 'Next of kin',
    manager: 'Administrator', dues: 'Bills',
    idLabel: 'Staff / patient no.', classLabel: 'Department', idCheck: 'Staff check',
  },
};

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false, requests: false, rollcall: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: false, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  university: { ...ALL_ON, household: false, gatelog: false, shifts: true, stays: false, visiting: true, requests: true, rollcall: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: false, requests: true, rollcall: true },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: true, requests: true, rollcall: true },
};

// ── Roles inside a site (client copy of server/utils/siteRoles.js) ──
// Everyone is auth role 'resident'; user.siteRole says what they are here.
const R = (key, label, plural, extra = {}) => ({ key, label, plural, staff: false, responds: [], scoped: false, onCall: false, assignable: false, specialty: false, rollcall: false, ...extra });
const ALL_ALERTS = ['medical', 'security', 'fire', 'other'];

export const ROLES = {
  estate: [R('resident', 'Resident', 'Residents')],
  hospital: [
    R('patient', 'Patient', 'Patients'),
    R('doctor', 'Doctor', 'Doctors', { staff: true, responds: ['medical'], onCall: true, assignable: true, specialty: true }),
    R('nurse', 'Nurse', 'Nurses', { staff: true, responds: ['medical'], scoped: true, onCall: true, assignable: true }),
    R('staff', 'Hospital staff', 'Hospital staff', { staff: true, rollcall: true }),
  ],
  university: [
    R('student', 'Student', 'Students'),
    R('lecturer', 'Lecturer', 'Lecturers', { staff: true, assignable: true, specialty: true }),
    R('warden', 'Hall warden / porter', 'Hall wardens & porters', { staff: true, responds: ALL_ALERTS, scoped: true, assignable: true, rollcall: true }),
    R('clinic', 'Clinic staff', 'Clinic staff', { staff: true, responds: ['medical'], onCall: true }),
    R('staff', 'University staff', 'University staff', { staff: true, rollcall: true }),
  ],
  school: [
    R('student', 'Student', 'Students'),
    R('teacher', 'Teacher', 'Teachers', { staff: true, responds: ['medical', 'security', 'other'], scoped: true, assignable: true, specialty: true, rollcall: true }),
    R('nurse', 'School nurse', 'School nurses', { staff: true, responds: ['medical'], onCall: true }),
    R('staff', 'School staff', 'School staff', { staff: true, rollcall: true }),
  ],
  hotel: [
    R('guest', 'Guest', 'Guests'),
    R('front_desk', 'Front desk', 'Front desk', { staff: true, responds: ['security', 'other'] }),
    R('housekeeping', 'Housekeeping', 'Housekeeping', { staff: true }),
    R('maintenance', 'Maintenance', 'Maintenance', { staff: true }),
    R('duty_manager', 'Duty manager', 'Duty managers', { staff: true, responds: ALL_ALERTS, onCall: true, rollcall: true }),
  ],
  industrial: [
    R('employee', 'Employee', 'Employees'),
    R('supervisor', 'Supervisor', 'Supervisors', { staff: true, responds: ALL_ALERTS, scoped: true, assignable: true, rollcall: true }),
    R('safety_officer', 'Safety officer', 'Safety officers', { staff: true, responds: ALL_ALERTS, onCall: true, rollcall: true }),
    R('first_aider', 'First aider', 'First aiders', { staff: true, responds: ['medical'], onCall: true }),
  ],
};

export const ASSIGN_LABEL = {
  estate: '', hospital: 'Care team', university: 'Adviser & warden', school: 'Class teacher',
  hotel: '', industrial: 'Supervisor',
};

export const REQUEST_KINDS = {
  estate: [],
  hospital: [
    { key: 'call_nurse', label: 'Call a nurse',        roles: ['nurse'],  urgent: true },
    { key: 'assistance', label: 'Help with something', roles: ['nurse'] },
    { key: 'meal',       label: 'Food & drink',        roles: ['staff'] },
    { key: 'other',      label: 'Something else',      roles: ['staff', 'nurse'] },
  ],
  university: [
    { key: 'hostel_repair', label: 'Hostel repair',       roles: ['warden'] },
    { key: 'clinic',        label: 'See the clinic',      roles: ['clinic'] },
    { key: 'other',         label: 'Ask the hall office', roles: ['warden'] },
  ],
  school: [
    { key: 'sick_bay', label: 'Sick bay',            roles: ['nurse'], urgent: true },
    { key: 'teacher',  label: 'Message the teacher', roles: ['teacher'] },
    { key: 'other',    label: 'School office',       roles: ['staff'] },
  ],
  hotel: [
    { key: 'housekeeping', label: 'Housekeeping',   roles: ['housekeeping'] },
    { key: 'maintenance',  label: 'Repairs',        roles: ['maintenance'] },
    { key: 'room_service', label: 'Room service',   roles: ['front_desk'] },
    { key: 'concierge',    label: 'Concierge',      roles: ['front_desk'] },
    { key: 'other',        label: 'Something else', roles: ['front_desk', 'duty_manager'] },
  ],
  industrial: [
    { key: 'incident',  label: 'Report an injury or incident', roles: ['supervisor', 'safety_officer', 'first_aider'], urgent: true },
    { key: 'hazard',    label: 'Report a hazard',               roles: ['safety_officer', 'supervisor'] },
    { key: 'equipment', label: 'Equipment fault',               roles: ['supervisor'] },
  ],
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

// The last site type this device saw — used before anything is loaded
// (boot loader, login screen) so a hospital guard doesn't see "estate".
export const LAST_TYPE_KEY = 'ac:lastSiteType';
export const readLastSiteType = () => {
  try { return normType(localStorage.getItem(LAST_TYPE_KEY)); } catch { return 'estate'; }
};
export const writeLastSiteType = (t) => {
  try { if (TYPES.includes(t)) localStorage.setItem(LAST_TYPE_KEY, t); } catch { /* ignore */ }
};

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
    roles: ROLES[t],
    defaultRole: ROLES[t][0].key,
    assignLabel: ASSIGN_LABEL[t] || '',
    requestKinds: REQUEST_KINDS[t] || [],
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
