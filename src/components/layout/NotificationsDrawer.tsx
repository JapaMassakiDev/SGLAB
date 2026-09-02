import React, { useState, useEffect } from 'react';
import { useApp, type NavTab } from '../../app/AppContext';
import { notificationRepo } from '../../infrastructure/mocks/repositories';
import type { Notification } from '../../domain/notifications/types';
import { X, CheckCheck, Bell, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const NotificationsDrawer: React.FC = () => {
  const {
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    setActiveTab,
    currentUser,
    refreshTrigger,
  } = useApp();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNotificationsDrawerOpen) {
      loadNotifications();
    }
  }, [isNotificationsDrawerOpen, refreshTrigger, currentUser.id]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const list = await notificationRepo.findAll(currentUser.id);
      setNotifications(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await notificationRepo.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await notificationRepo.markAllAsRead(currentUser.id);
    loadNotifications();
  };

  const handleNavigate = (tab?: string) => {
    if (tab) {
      setActiveTab(tab as NavTab);
      setIsNotificationsDrawerOpen(false);
    }
  };

  if (!isNotificationsDrawerOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'error':
      case 'alert':
        return <AlertCircle size={16} color="#f43f5e" />;
      case 'warning':
        return <AlertTriangle size={16} color="#f59e0b" />;
      default:
        return <Info size={16} color="#00f0ff" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 250,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setIsNotificationsDrawerOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideInRight 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem' }}>Central de Notificações</h2>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleMarkAllRead}
              className="btn btn-secondary btn-sm"
              title="Marcar todas como lidas"
              style={{ fontSize: '0.74rem' }}
            >
              <CheckCheck size={14} /> Ler todas
            </button>
            <button
              onClick={() => setIsNotificationsDrawerOpen(false)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Carregando notificações...</p>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p>Nenhuma notificação no momento.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  background: n.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 240, 255, 0.05)',
                  border: `1px solid ${n.read ? 'var(--border)' : 'rgba(0, 240, 255, 0.3)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getIcon(n.type)}
                    <strong style={{ fontSize: '0.88rem', color: n.read ? 'var(--text-main)' : 'var(--primary)' }}>
                      {n.title}
                    </strong>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                      }}
                      title="Marcar como lida"
                    >
                      Lida
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {n.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(n.createdAt).toLocaleString('pt-BR')}
                  </span>
                  {n.linkTab && (
                    <button
                      onClick={() => handleNavigate(n.linkTab)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    >
                      Acessar Tela &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
