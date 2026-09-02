import React from 'react';

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, className = '' }) => {
  const formatLabel = (val: string) => {
    switch (val) {
      case 'available': return 'Disponível';
      case 'occupied': return 'Ocupado';
      case 'in_use': return 'Em Uso';
      case 'reserved': return 'Reservado';
      case 'maintenance': return 'Em Manutenção';
      case 'closed': return 'Interditado';
      case 'damaged': return 'Avariado';
      case 'confirmed': return 'Confirmada';
      case 'pending_approval': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Concluída';
      case 'active': return 'Ativa';
      case 'returned': return 'Devolvido';
      case 'late': return 'Atrasado';
      case 'waiting': return 'Na Fila';
      case 'notified': return 'Vaga Aberta';
      case 'claimed': return 'Assumida';
      case 'open': return 'Aberta';
      case 'in_progress': return 'Em Reparo';
      case 'waiting_parts': return 'Aguard. Peça';
      case 'resolved': return 'Resolvida';
      case 'discarded': return 'Baixado';
      default: return val.toUpperCase();
    }
  };

  return (
    <span className={`badge badge-${status} ${className}`}>
      <span className="pulse-dot" style={{ background: 'currentColor' }}></span>
      {label || formatLabel(status)}
    </span>
  );
};
