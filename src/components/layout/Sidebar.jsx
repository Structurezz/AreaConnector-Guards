import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { QrCode, ClipboardList, Shield, LogOut, Settings as SettingsIcon } from 'lucide-react';

const links = [
  { to: '/verify', icon: QrCode, label: 'Verify Visitor' },
  { to: '/log', icon: ClipboardList, label: 'Entry Log' },
  { to: '/alerts', icon: Shield, label: 'Live Alerts' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

const activeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 12px',
  borderRadius: 10,
  marginBottom: 2,
  color: '#FFFFFF',
  background: 'rgba(59,130,246,0.15)',
  borderLeft: '2px solid #3B82F6',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
};

const inactiveStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 12px',
  borderRadius: 10,
  marginBottom: 2,
  color: 'rgba(255,255,255,0.5)',
  background: 'transparent',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
};

function NavItem({ to, icon: Icon, label, onClose }) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      key={to}
      to={to}
      end={to === '/verify'}
      onClick={onClose}
      style={({ isActive }) => {
        if (isActive) return activeStyle;
        return {
          ...inactiveStyle,
          background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        };
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

function SignOutButton({ onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        background: hovered ? 'rgba(239,68,68,0.1)' : 'transparent',
        color: hovered ? '#FCA5A5' : 'rgba(255,255,255,0.35)',
        fontSize: 13,
        fontWeight: 500,
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      <LogOut size={15} />
      Sign out
    </button>
  );
}

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const estateName =
    user?.estateId && typeof user.estateId === 'object'
      ? user.estateId.name
      : 'AreaConnect Guard';

  return (
    <aside
      className={`flex flex-col h-full ${mobile ? 'w-72' : 'w-64'}`}
      style={{
        background: 'linear-gradient(180deg, #060E1A 0%, #0B1626 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand / Logo */}
      <Link
        to="/dashboard"
        style={{
          display: 'block',
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          textDecoration: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Shield icon */}
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'linear-gradient(135deg,#3B82F6,#2563EB)',
              boxShadow: '0 0 16px rgba(59,130,246,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 4L6 12v16l14 8 14-8V12L20 4z"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                fill="none"
              />
              <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.2)" />
              <path d="M20 14l-6 3.5v7L20 28l6-3.5v-7L20 14z" fill="rgba(255,255,255,0.6)" />
              <rect x="18" y="18" width="4" height="5" rx="1" fill="white" />
              <circle cx="20" cy="17" r="1.5" fill="white" />
            </svg>
          </div>

          {/* Brand text */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
              <span style={{ color: '#FFFFFF' }}>Area</span>
              <span style={{ color: '#3B82F6' }}>Connect</span>
              {' '}
              <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>Guard</span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {estateName}
            </div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase',
            padding: '8px 12px',
            margin: 0,
          }}
        >
          Navigation
        </p>
        {links.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} onClose={onClose} />
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          to="/settings"
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textDecoration: 'none', padding: 4, borderRadius: 10 }}
        >
          {/* Avatar */}
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt=""
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(59,130,246,0.30)' }}
            />
          ) : (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email}
            </div>
          </div>
        </Link>

        <SignOutButton
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        />
      </div>
    </aside>
  );
}
