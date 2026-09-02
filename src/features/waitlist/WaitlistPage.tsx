import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import { waitlistRepo, labRepo, equipmentRepo } from '../../infrastructure/mocks/repositories';
import type { WaitlistEntry } from '../../domain/reservations/types';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Equipment } from '../../domain/equipment/types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  Plus,
  Calendar,
  XCircle,
  Trophy,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export const WaitlistPage: React.FC = () => {
  const { currentUser, showToast, refreshTrigger } = useApp();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [resourceType, setResourceType] = useState<'lab' | 'equipment'>('lab');
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('17:30');
  const [purpose, setPurpose] = useState('');

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, labList, eqList] = await Promise.all([
        waitlistRepo.findAll(),
        labRepo.findAll(),
        equipmentRepo.findAll(),
      ]);
      setEntries(list.sort((a, b) => b.priorityScore - a.priorityScore));
      setLabs(labList);
      setEquipmentList(eqList);
      if (labList.length > 0 && !resourceId) {
        setResourceId(labList[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar fila';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    let resourceName = '';
    if (resourceType === 'lab') {
      const l = labs.find((item) => item.id === resourceId);
      if (l) resourceName = `${l.name} (${l.code})`;
    } else {
      const eq = equipmentList.find((item) => item.id === resourceId);
      if (eq) resourceName = `${eq.name} (${eq.tag})`;
    }

    try {
      await waitlistRepo.join({
        resourceType,
        resourceId,
        resourceName,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        date,
        startTime,
        endTime,
        purpose: purpose || 'Fila de espera para atividade prática',
      });

      showToast('Inscrição na fila de espera realizada com sucesso!', 'success');
      setIsJoinModalOpen(false);
      setPurpose('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar na fila';
      showToast(msg, 'error');
    }
  };

  const handleCancelEntry = async (id: string) => {
    try {
      await waitlistRepo.cancel(id);
      showToast('Inscrição na fila cancelada.', 'info');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cancelar';
      showToast(msg, 'error');
    }
  };

  const activeWaiting = entries.filter((e) => e.status === 'waiting');
  const claimedCount = entries.filter((e) => e.status === 'claimed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock color="var(--primary)" /> Fila de Espera Inteligente
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Quando um laboratório ou equipamento de ponta está 100% ocupado, a fila de espera gerencia a promoção automática.
          </p>
        </div>

        <button onClick={() => setIsJoinModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Entrar na Fila
        </button>
      </div>

      {/* Rules Explainer Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(19, 29, 54, 0.9) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <HelpCircle size={18} />
          <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>Como Funciona a Prioridade e Promoção Automática</h3>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Cada solicitação na fila recebe uma <strong>Pontuação de Prioridade (Score)</strong> calculada conforme as diretrizes acadêmicas:
          Professores recebem prioridade base <strong>100 pts</strong> (para garantia de aulas institucionais), Técnicos <strong>75 pts</strong> e Alunos <strong>50 pts</strong>.
          Em caso de empate no perfil, o desempate segue a ordem cronológica de inscrição.
          Assim que uma reserva existente for <strong>cancelada</strong>, o primeiro colocado da fila é <strong>automaticamente promovido para reserva confirmada</strong> e notificado pelo sistema!
        </p>
      </div>

      {/* Metrics */}
      <div className="grid-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Aguardando Vaga
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--warning)' }}>{activeWaiting.length}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Vagas Promovidas
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{claimedCount.length}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)' }}>
            <Trophy size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sua Prioridade Atual
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)' }}>
              {currentUser.role === 'teacher' ? '100 pts (Alta)' : currentUser.role === 'student' ? '50 pts (Normal)' : '75 pts'}
            </h3>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Carregando lista de espera...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            A fila de espera está vazia no momento.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Posição</th>
                  <th>Recurso Desejado</th>
                  <th>Solicitante</th>
                  <th>Horário Solicitado</th>
                  <th>Pontuação</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const isTop = index === 0 && entry.status === 'waiting';

                  return (
                    <tr
                      key={entry.id}
                      style={{
                        background: isTop ? 'rgba(0, 240, 255, 0.04)' : undefined,
                      }}
                    >
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isTop ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                            color: isTop ? '#080b11' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          #{index + 1}
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {entry.resourceName}
                          </strong>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Motivo: {entry.purpose}
                          </p>
                        </div>
                      </td>

                      <td>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{entry.userName}</span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {entry.userRole.toUpperCase()}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                            <Calendar size={13} color="var(--primary)" /> {entry.date}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {entry.startTime} às {entry.endTime}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 240, 255, 0.1)',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}
                        >
                          <Trophy size={12} /> {entry.priorityScore} pts
                        </span>
                      </td>

                      <td>
                        <Badge status={entry.status} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {entry.status === 'waiting' && (
                          <button
                            onClick={() => handleCancelEntry(entry.id)}
                            className="btn btn-secondary btn-sm"
                            title="Sair da fila"
                          >
                            <XCircle size={14} /> Desistir
                          </button>
                        )}
                        {entry.status === 'claimed' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                            Convertida em Reserva
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Join Waitlist */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Entrar na Fila de Espera"
      >
        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label">Tipo de Recurso</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setResourceType('lab');
                  if (labs.length > 0) setResourceId(labs[0].id);
                }}
                className={`btn ${resourceType === 'lab' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Laboratório
              </button>
              <button
                type="button"
                onClick={() => {
                  setResourceType('equipment');
                  if (equipmentList.length > 0) setResourceId(equipmentList[0].id);
                }}
                className={`btn ${resourceType === 'equipment' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Equipamento
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Recurso Desejado *</label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="form-select"
              required
            >
              {resourceType === 'lab'
                ? labs.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))
                : equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.name} ({eq.tag})</option>
                  ))}
            </select>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Início</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Término</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Finalidade da Atividade</label>
            <textarea
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Descreva a atividade e a relevância de obter a vaga..."
              className="form-textarea"
            />
          </div>

          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
            }}
          >
            Sua solicitação entrará com pontuação de <strong>{currentUser.role === 'teacher' ? '100' : '50'} pontos</strong> com base no seu perfil ({currentUser.role.toUpperCase()}).
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
            <button type="button" onClick={() => setIsJoinModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Confirmar Entrada na Fila
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
