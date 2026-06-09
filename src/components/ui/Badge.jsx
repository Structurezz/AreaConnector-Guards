export default function Badge({ children, variant = 'gray' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export const visitorStatusBadge = (status) => {
  const map = {
    active: 'green',
    'checked-in': 'blue',
    'checked-out': 'gray',
    expired: 'yellow',
    blacklisted: 'red',
    pending: 'yellow',
  };
  return map[status] || 'gray';
};

export const alertTypeBadge = (type) => {
  const map = { security: 'red', fire: 'red', medical: 'blue', noise: 'yellow', other: 'gray' };
  return map[type] || 'gray';
};

export const alertStatusBadge = (status) => {
  const map = { open: 'red', acknowledged: 'yellow', resolved: 'green' };
  return map[status] || 'gray';
};
