/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useState } from 'react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading]       = useState(false);
  const [passwords, setPasswords]   = useState({
    current: '', newPass: '', confirm: '',
  });

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword:     passwords.newPass,
      });
      toast.success('Password updated successfully');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  const inputCls: React.CSSProperties = {
    width:        '100%',
    padding:      '10px 14px',
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color:        '#F1F5F9',
    fontSize:     '13px',
    outline:      'none',
  };

  const labelCls: React.CSSProperties = {
    display:       'block',
    fontSize:      '11px',
    fontWeight:    600,
    color:         'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom:  '6px',
  };

  const cardCls: React.CSSProperties = {
    background:   '#0D1424',
    border:       '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding:      '1.5rem',
    marginBottom: '1rem',
  };

  return (
    <div style={{
      fontFamily:  "'Sora', sans-serif",
      background:  '#070B14',
      minHeight:   '100vh',
      padding:     '2rem',
      color:       '#E2E8F0',
      maxWidth:    '640px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
        input:focus { border-color: rgba(56,189,248,0.5) !important; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1.75rem' }}>
        Settings
      </h1>

      {/* Account info */}
      <div style={cardCls}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1rem' }}>
          Account
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width:        '48px',
            height:       '48px',
            borderRadius: '12px',
            background:   'linear-gradient(135deg, #0EA5E9, #8B5CF6)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '18px',
            fontWeight:   700,
            color:        '#fff',
          }}>
            {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
              {user?.full_name}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
              {user?.email} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={cardCls}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1rem' }}>
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelCls}>Current Password</label>
              <input
                type="password"
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                style={inputCls}
                required
              />
            </div>
            <div>
              <label style={labelCls}>New Password</label>
              <input
                type="password"
                value={passwords.newPass}
                onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                style={inputCls}
                required
              />
            </div>
            <div>
              <label style={labelCls}>Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                style={inputCls}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop:    '1rem',
              padding:      '10px 22px',
              background:   'linear-gradient(135deg, #0EA5E9, #38BDF8)',
              border:       'none',
              borderRadius: '10px',
              color:        '#fff',
              fontSize:     '13px',
              fontWeight:    600,
              cursor:       'pointer',
              opacity:      loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div style={{
        ...cardCls,
        border: '1px solid rgba(248,113,113,0.2)',
        background: 'rgba(248,113,113,0.04)',
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F87171', margin: '0 0 0.75rem' }}>
          Danger Zone
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem' }}>
          Sign out of your account across all sessions.
        </p>
        <button
          onClick={logout}
          style={{
            padding:      '9px 20px',
            background:   'rgba(248,113,113,0.1)',
            border:       '1px solid rgba(248,113,113,0.3)',
            borderRadius: '8px',
            color:        '#F87171',
            fontSize:     '13px',
            cursor:       'pointer',
            fontWeight:    500,
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}