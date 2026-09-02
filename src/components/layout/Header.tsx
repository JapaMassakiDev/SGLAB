import React from 'react';
import { useApp, type NavTab } from '../../app/AppContext';
import {
  Cpu,
  Layers,
  Wrench,
  CalendarCheck,
  Clock,
  ClipboardCheck,
  Tv,
  FileText,
  Bell,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    unreadNotificationsCount,
    setIsNotificationsDrawerOpen,
    hasPermission,
  } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; requiredPerm?: string }[] = [
    { id: 'labs', label: 'Laboratórios', icon: <Layers size={16} /> },
    { id: 'equipment', label: 'Equipamentos', icon: <Cpu size={16} /> },
    { id: 'reservations', label: 'Reservas', icon: <CalendarCheck size={16} /> },
    { id: 'waitlist', label: 'Fila de Espera', icon: <Clock size={16} /> },
    { id: 'custody', label: 'Custódia & Balcão', icon: <ClipboardCheck size={16} /> },
    { id: 'maintenance', label: 'Manutenção', icon: <Wrench size={16} /> },
    { id: 'kiosk', label: 'Painel TV (Público)', icon: <Tv size={16} /> },
    { id: 'audit', label: 'Auditoria', icon: <FileText size={16} />, requiredPerm: 'view_audit' },
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand */}
        <div className="brand-logo" onClick={() => setActiveTab('labs')}>
          <div className="logo-icon-wrap">
            <Cpu size={22} />
          </div>
          <div className="brand-text">
            <h1>
              LabTech <span style={{ fontSize: '0.68em', color: 'var(--primary)', fontWeight: 400 }}>Pro</span>
            </h1>
            <p className="brand-subtitle">Gestão Inteligente de Laboratórios e Equipamentos</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          {navItems.map((item) => {
            if (item.requiredPerm && !hasPermission(item.requiredPerm as any)) {
              return null;
            }
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side: Notifications & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Notification Button */}
          <button
            onClick={() => setIsNotificationsDrawerOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              position: 'relative',
              padding: '8px',
              borderRadius: '50%',
            }}
            title="Notificações"
            aria-label="Abrir notificações"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px var(--danger-glow)',
                }}
              >
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Persona Profile Tag */}
          <div className="user-persona-card">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="persona-avatar"
            />
            <div className="persona-details">
              <span className="persona-name">{currentUser.name}</span>
              <span className={`persona-role-badge role-${currentUser.role}`}>
                {currentUser.role === 'admin'
                  ? 'Gestor Geral'
                  : currentUser.role === 'technician'
                  ? 'Técnica de Lab'
                  : currentUser.role === 'teacher'
                  ? 'Docente / Pesquisador'
                  : 'Aluno / Bolsista'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
