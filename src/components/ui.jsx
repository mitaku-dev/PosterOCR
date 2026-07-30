import { TYPE_COLORS } from '../data/initialState';

export function EntityTag({ type, label, onRemove, onClick, selected }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.other;
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 9px', borderRadius: 20, fontSize: 12,
        background: c.bg, color: c.text,
        border: `0.5px solid ${selected ? c.text : c.border}`,
        boxShadow: selected ? `0 0 0 2px ${c.border}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .15s', userSelect: 'none',
      }}
    >
      {label}
      {onRemove && (
        <span
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ opacity: .6, fontSize: 11, cursor: 'pointer', marginLeft: 2 }}
        >×</span>
      )}
    </span>
  );
}

export function Badge({ children, color = 'gray' }) {
  const map = {
    blue:   { bg: '#E6F1FB', text: '#185FA5' },
    green:  { bg: '#E1F5EE', text: '#085041' },
    amber:  { bg: '#FAEEDA', text: '#633806' },
    red:    { bg: '#FCEBEB', text: '#A32D2D' },
    gray:   { bg: '#F1EFE8', text: '#444441' },
    purple: { bg: '#EEEDFE', text: '#3C3489' },
  };
  const c = map[color] || map.gray;
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, padding: '2px 8px',
      borderRadius: 10, fontWeight: 500,
      background: c.bg, color: c.text,
    }}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score }) {
  const color = score >= 90 ? '#085041' : score >= 75 ? '#633806' : '#A32D2D';
  const bg    = score >= 90 ? '#E1F5EE' : score >= 75 ? '#FAEEDA' : '#FCEBEB';
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 10,
      background: bg, color, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {score}%
    </span>
  );
}

export function Btn({ children, onClick, variant = 'default', size = 'md', disabled, style }) {
  const base = {
    padding: size === 'sm' ? '4px 10px' : '7px 16px',
    fontSize: size === 'sm' ? 12 : 13,
    borderRadius: 8, border: '0.5px solid', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', transition: 'all .15s', display: 'inline-flex',
    alignItems: 'center', gap: 6, opacity: disabled ? .5 : 1,
    ...style,
  };
  const variants = {
    default: { background: 'transparent', color: 'var(--fg)', borderColor: 'var(--border-md)' },
    primary: { background: 'var(--fg)', color: 'var(--bg)', borderColor: 'var(--fg)' },
    danger:  { background: 'transparent', color: '#A32D2D', borderColor: '#F09595' },
    success: { background: 'transparent', color: '#085041', borderColor: '#5DCAA5' },
    ghost:   { background: 'transparent', color: 'var(--fg-muted)', border: 'none', padding: '4px 6px' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </button>
  );
}

export function Divider({ margin = '12px 0' }) {
  return <div style={{ height: '0.5px', background: 'var(--border-faint)', margin }} />;
}

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)',
      textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '0.5px solid var(--border-faint)',
      borderRadius: 12,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ left, right }) {
  return (
    <div style={{
      padding: '11px 16px',
      borderBottom: '0.5px solid var(--border-faint)',
      background: 'var(--bg-secondary)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{left}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
    </div>
  );
}

export function Collapsible({ label, badge, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
          transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{badge} {open ? '▴' : '▾'}</span>
      </div>
      {open && <div style={{ padding: '8px 4px 4px' }}>{children}</div>}
    </div>
  );
}

export function StepFooter({ left, right, style }) {
  return (
    <div style={{
      padding: '11px 16px', borderTop: '0.5px solid var(--border-faint)',
      background: 'var(--bg-secondary)',
      display: 'flex', justifyContent: !left || !right ? 'flex-end' : 'space-between',
      alignItems: 'center',
      ...style,
    }}>
      {left && <div>{left}</div>}
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
    </div>
  );
}

export function OptionalBadge() {
  return (
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 6,
      border: '0.5px solid var(--border-faint)', color: 'var(--fg-faint)',
      background: 'var(--bg-secondary)', fontStyle: 'italic',
      verticalAlign: 'middle',
    }}>
      optional
    </span>
  );
}

// inject React into scope since this file is imported as a module
import React from 'react';
