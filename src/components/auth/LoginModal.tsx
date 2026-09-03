import React from 'react';
import { useApp } from '../../app/AppContext';
import type { Role } from '../../domain/auth/types';
import { ShieldCheck, GraduationCap, Wrench, UserCircle, Check, X, LogIn } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { allUsers, currentUser, switchUserRole } = useApp();

  if (!isOpen) return null;

  const handleSelectUser = async (role: Role) => {
    await switchUserRole(role);
    onClose();
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck size={20} color="var(--primary)" />;
      case 'teacher':
        return <GraduationCap size={20} color="var(--accent)" />;
      case 'technician':
        return <Wrench size={20} color="var(--warning)" />;
      case 'student':
        return <UserCircle size={20} color="var(--text-secondary)" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '580px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <LogIn size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Autenticação Simulada</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Selecione o perfil de demonstração sem necessidade de senha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px' }}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Perfis disponíveis com regras e permissões distintas do sistema LabTech:
          </p>

          {allUsers.map((user) => {
            const isSelected = currentUser.id === user.id;

            return (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user.role)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected
                    ? '2px solid var(--primary)'
                    : '1px solid var(--border-color)',
                  background: isSelected
                    ? 'rgba(56, 189, 248, 0.08)'
                    : 'var(--card-bg-subtle, rgba(255, 255, 255, 0.03))',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                className="user-select-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border-color)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{user.name}</strong>
                      <span className={`persona-role-badge role-${user.role}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {user.title} • {user.department}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getRoleIcon(user.role)}
                  {isSelected ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        color: 'var(--primary)',
                        fontWeight: 600,
                      }}
                    >
                      <Check size={16} /> Ativo
                    </span>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Acessar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Sessão mockada em memória (LabTech Mock Engine)
          </span>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
