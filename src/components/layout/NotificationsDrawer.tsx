import React, { useState, useEffect } from 'react';
import { useApp, type NavTab } from '../../app/AppContext';
import { notificationRepo } from '../../infrastructure/mocks/repositories';
import type { Notification, SimulatedEmailLog } from '../../domain/notifications/types';
import { X, CheckCheck, Bell, Info, CheckCircle2, AlertTriangle, AlertCircle, Mail, Send } from 'lucide-react';

export const NotificationsDrawer: React.FC = () => {
  const {
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    setActiveTab,
    currentUser,
    refreshTrigger,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'notifications' | 'emails'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emails, setEmails] = useState<SimulatedEmailLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNotificationsDrawerOpen) {
      loadData();
    }
  }, [isNotificationsDrawerOpen, refreshTrigger, currentUser.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifList, emailList] = await Promise.all([
        notificationRepo.findAll(currentUser.id),
        notificationRepo.getEmailLogs(),
      ]);
      setNotifications(notifList);
      setEmails(emailList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await notificationRepo.markAsRead(id);
    loadData();
  };

  const handleMarkAllRead = async () => {
    await notificationRepo.markAllAsRead(currentUser.id);
    loadData();
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
          maxWidth: '440px',
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
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem' }}>Central de Comunicação</h2>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {activeSubTab === 'notifications' && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-secondary btn-sm"
                title="Marcar todas como lidas"
                style={{ fontSize: '0.74rem' }}
              >
                <CheckCheck size={14} /> Ler todas
              </button>
            )}
            <button
              onClick={() => setIsNotificationsDrawerOpen(false)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', borderRadius: '50%' }}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sub-tabs: Notificações vs E-mails Simulados */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.2)' }}>
          <button
            onClick={() => setActiveSubTab('notifications')}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              background: activeSubTab === 'notifications' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              borderBottom: activeSubTab === 'notifications' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSubTab === 'notifications' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Bell size={14} />
            Notificações ({notifications.filter((n) => !n.read).length})
          </button>
          <button
            onClick={() => setActiveSubTab('emails')}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              background: activeSubTab === 'emails' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              borderBottom: activeSubTab === 'emails' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeSubTab === 'emails' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Mail size={14} />
            E-mails Simulados ({emails.length})
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Carregando dados...</p>
          ) : activeSubTab === 'notifications' ? (
            notifications.length === 0 ? (
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
            )
          ) : (
            // Simulated Emails View
            emails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Mail size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p>Nenhum e-mail simulado enviado ainda.</p>
              </div>
            ) : (
              emails.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Send size={11} /> Para: {m.recipientName} ({m.to})
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(m.sentAt).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                    {m.subject}
                  </strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                    {m.body}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                      Contexto: {m.context}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

