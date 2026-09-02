import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import {
  reservationRepo,
  labRepo,
  equipmentRepo,
  waitlistRepo,
} from '../../infrastructure/mocks/repositories';
import type { Reservation, ReservationType, RecurrenceRule } from '../../domain/reservations/types';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Equipment } from '../../domain/equipment/types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  CalendarCheck,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Repeat,
  AlertCircle,
  XCircle,
  UserCheck,
  Filter,
} from 'lucide-react';

export const ReservationsPage: React.FC = () => {
  const { currentUser, hasPermission, showToast, setActiveTab, refreshTrigger } = useApp();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'lab' | 'equipment'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [conflictPrompt, setConflictPrompt] = useState<{
    message: string;
    resourceType: ReservationType;
    resourceId: string;
    resourceName: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
  } | null>(null);

  // Form states
  const [resType, setResType] = useState<ReservationType>('lab');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [purpose, setPurpose] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(25);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'weekly' | 'biweekly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([new Date().getDay() || 1]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resList, labList, eqList] = await Promise.all([
        reservationRepo.findAll(),
        labRepo.findAll(),
        equipmentRepo.findAll(),
      ]);
      setReservations(resList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLabs(labList);
      setEquipmentList(eqList);

      if (labList.length > 0 && !selectedResourceId) {
        setSelectedResourceId(labList[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar reservas';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    setTitle('');
    setPurpose('');
    setConflictPrompt(null);
    if (resType === 'lab' && labs.length > 0) {
      setSelectedResourceId(labs[0].id);
    } else if (resType === 'equipment' && equipmentList.length > 0) {
      setSelectedResourceId(equipmentList[0].id);
    }
    setIsNewModalOpen(true);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      showToast('O horário de término deve ser após o horário de início', 'warning');
      return;
    }

    let resourceName = '';
    let resourceCodeOrTag = '';

    if (resType === 'lab') {
      const lab = labs.find((l) => l.id === selectedResourceId);
      if (!lab) return;
      resourceName = lab.name;
      resourceCodeOrTag = lab.code;
    } else {
      const eq = equipmentList.find((e) => e.id === selectedResourceId);
      if (!eq) return;
      resourceName = eq.name;
      resourceCodeOrTag = eq.tag;
    }

    try {
      if (isRecurring) {
        if (!hasPermission('create_recurring_reservation')) {
          showToast('Apenas Professores e Administradores podem criar reservas recorrentes', 'warning');
          return;
        }

        const rule: RecurrenceRule = {
          frequency: recurrenceFreq,
          daysOfWeek: selectedDays,
          startDate: date,
          endDate: recurrenceEndDate,
          totalOccurrences: 0,
        };

        const result = await reservationRepo.createRecurring(
          {
            title,
            type: resType,
            resourceId: selectedResourceId,
            resourceName,
            resourceCodeOrTag,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            userDepartment: currentUser.department,
            date,
            startTime,
            endTime,
            purpose,
            attendeesCount: Number(attendeesCount),
            status: currentUser.role === 'admin' ? 'confirmed' : 'pending_approval',
          },
          rule
        );

        if (result.conflicts.length > 0) {
          showToast(
            `Reserva recorrente criada com ${result.created.length} datas. Atenção: Houve conflito em ${result.conflicts.length} datas (${result.conflicts.join(', ')}) que foram ignoradas.`,
            'warning'
          );
        } else {
          showToast(`Série recorrente criada com sucesso (${result.created.length} aulas agendadas)!`, 'success');
        }
        setIsNewModalOpen(false);
        loadData();
      } else {
        // Simple reservation
        await reservationRepo.create({
          title,
          type: resType,
          resourceId: selectedResourceId,
          resourceName,
          resourceCodeOrTag,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          userDepartment: currentUser.department,
          date,
          startTime,
          endTime,
          purpose,
          attendeesCount: Number(attendeesCount),
          status: currentUser.role === 'admin' ? 'confirmed' : 'pending_approval',
          isRecurring: false,
        });

        showToast('Reserva solicitada com sucesso!', 'success');
        setIsNewModalOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar';
      // If conflict, show interactive prompt to enter waitlist
      if (msg.includes('Conflito detectado')) {
        setConflictPrompt({
          message: msg,
          resourceType: resType,
          resourceId: selectedResourceId,
          resourceName,
          date,
          startTime,
          endTime,
          purpose: purpose || title,
        });
      } else {
        showToast(msg, 'error');
      }
    }
  };

  const handleJoinWaitlistFromConflict = async () => {
    if (!conflictPrompt) return;
    try {
      await waitlistRepo.join({
        resourceType: conflictPrompt.resourceType,
        resourceId: conflictPrompt.resourceId,
        resourceName: conflictPrompt.resourceName,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        date: conflictPrompt.date,
        startTime: conflictPrompt.startTime,
        endTime: conflictPrompt.endTime,
        purpose: conflictPrompt.purpose,
      });

      showToast(`Você foi adicionado à Fila de Espera para ${conflictPrompt.resourceName}!`, 'success');
      setIsNewModalOpen(false);
      setConflictPrompt(null);
      setActiveTab('waitlist');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar na fila';
      showToast(msg, 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await reservationRepo.approve(id, currentUser.name);
      showToast('Reserva aprovada formalmente!', 'success');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar';
      showToast(msg, 'error');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRes) return;
    if (!cancelReason) {
      showToast('Informe o motivo do cancelamento', 'warning');
      return;
    }
    try {
      await reservationRepo.cancel(cancellingRes.id, cancelReason);
      showToast('Reserva cancelada. Fila de espera avaliada para promoção automática!', 'info');
      setIsCancelModalOpen(false);
      setCancellingRes(null);
      setCancelReason('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cancelar';
      showToast(msg, 'error');
    }
  };

  const filtered = reservations.filter((r) => {
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const pendingCount = reservations.filter((r) => r.status === 'pending_approval').length;
  const recurringCount = reservations.filter((r) => r.isRecurring).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarCheck color="var(--primary)" /> Gerenciamento de Reservas
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Agendamentos pontuais, séries semestrais recorrentes, detecção automática de conflitos e aprovações.
          </p>
        </div>

        <button onClick={handleOpenNewModal} className="btn btn-primary">
          <Plus size={16} /> Nova Reserva
        </button>
      </div>

      {/* Metrics */}
      <div className="grid-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Confirmadas
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{confirmedCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pendentes de Aprovação
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--warning)' }}>{pendingCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--secondary)' }}>
            <Repeat size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Séries Recorrentes
            </span>
            <h3 style={{ fontSize: '1.6rem', color: '#818cf8' }}>{recurringCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Tipo de Recurso:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="all">Todos os Recursos</option>
            <option value="lab">Laboratórios</option>
            <option value="equipment">Equipamentos</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmadas</option>
            <option value="pending_approval">Pendentes</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Carregando agendamentos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Nenhuma reserva encontrada.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Recurso & Título</th>
                  <th>Solicitante</th>
                  <th>Data & Horário</th>
                  <th>Modalidade</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {res.resourceCodeOrTag} • {res.type === 'lab' ? 'SALA' : 'EQUIP'}
                        </span>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          {res.title}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {res.resourceName}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{res.userName}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {res.userRole.toUpperCase()} {res.userDepartment ? `• ${res.userDepartment}` : ''}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 600 }}>
                          <Calendar size={14} color="var(--primary)" /> {res.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <Clock size={13} /> {res.startTime} às {res.endTime}
                        </div>
                      </div>
                    </td>

                    <td>
                      {res.isRecurring ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                        >
                          <Repeat size={12} /> Recorrente ({res.recurrenceRule?.frequency === 'weekly' ? 'Semanal' : 'Quinzenal'})
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avulsa / Pontual</span>
                      )}
                    </td>

                    <td>
                      <Badge status={res.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {res.status === 'pending_approval' && hasPermission('approve_reservation') && (
                          <button
                            onClick={() => handleApprove(res.id)}
                            className="btn btn-success btn-sm"
                            title="Aprovar formalmente esta reserva"
                          >
                            <UserCheck size={14} /> Aprovar
                          </button>
                        )}

                        {res.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setCancellingRes(res);
                              setIsCancelModalOpen(true);
                            }}
                            className="btn btn-danger btn-sm"
                            title="Cancelar reserva"
                          >
                            <XCircle size={14} /> Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Reservation Wizard */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Solicitar Nova Reserva"
      >
        {conflictPrompt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <AlertCircle size={24} color="var(--danger)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--danger)', fontSize: '0.92rem' }}>
                  Conflito de Horário Encontrado!
                </strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {conflictPrompt.message}
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 240, 255, 0.08)',
                border: '1px solid rgba(0, 240, 255, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <h4 style={{ fontSize: '0.92rem', color: 'var(--primary)', marginBottom: '6px' }}>
                Entrar na Fila de Espera com Prioridade
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Se o titular atual cancelar este horário, o sistema promoverá e confirmará a sua reserva automaticamente
                com base nas regras institucionais (critério de desempate: perfil docente x discente e data de entrada).
              </p>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button
                type="button"
                onClick={() => setConflictPrompt(null)}
                className="btn btn-secondary"
              >
                Voltar e Mudar Horário
              </button>
              <button
                type="button"
                onClick={handleJoinWaitlistFromConflict}
                className="btn btn-primary"
              >
                Entrar na Fila de Espera
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateReservation}>
            {/* Type selector */}
            <div className="form-group">
              <label className="form-label">Tipo de Recurso</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setResType('lab');
                    if (labs.length > 0) setSelectedResourceId(labs[0].id);
                  }}
                  className={`btn ${resType === 'lab' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Laboratório Completo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResType('equipment');
                    if (equipmentList.length > 0) setSelectedResourceId(equipmentList[0].id);
                  }}
                  className={`btn ${resType === 'equipment' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Equipamento Individual
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Selecione o {resType === 'lab' ? 'Laboratório' : 'Equipamento'} *</label>
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="form-select"
                required
              >
                {resType === 'lab'
                  ? labs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code}) — Cap: {l.capacity}
                      </option>
                    ))
                  : equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.tag}) — {eq.status.toUpperCase()}
                      </option>
                    ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Título da Atividade / Disciplina *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Aula de Redes de Computadores II ou Ensaio de TCC"
                className="form-input"
              />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Início *</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Término *</label>
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
              <label className="form-label">Finalidade / Descrição Detalhada *</label>
              <textarea
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Explique os softwares que serão usados e o plano de aula..."
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimativa de Participantes (Alunos/Usuários)</label>
              <input
                type="number"
                min="1"
                max="80"
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                className="form-input"
              />
            </div>

            {/* Recurrence Options */}
            {hasPermission('create_recurring_reservation') && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '16px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <strong style={{ fontSize: '0.86rem', color: 'var(--primary)' }}>
                    Repetir periodicamente durante o semestre (Reserva Recorrente)
                  </strong>
                </label>

                {isRecurring && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="grid-2">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Frequência</label>
                        <select
                          value={recurrenceFreq}
                          onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                          className="form-select"
                        >
                          <option value="weekly">Semanal (Toda semana)</option>
                          <option value="biweekly">Quinzenal</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Data Limite do Semestre</label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ marginBottom: '6px' }}>Dias da Semana:</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { day: 1, label: 'Seg' },
                          { day: 2, label: 'Ter' },
                          { day: 3, label: 'Qua' },
                          { day: 4, label: 'Qui' },
                          { day: 5, label: 'Sex' },
                          { day: 6, label: 'Sáb' },
                        ].map((d) => {
                          const isSel = selectedDays.includes(d.day);
                          return (
                            <button
                              type="button"
                              key={d.day}
                              onClick={() => {
                                setSelectedDays((prev) =>
                                  prev.includes(d.day)
                                    ? prev.filter((x) => x !== d.day)
                                    : [...prev, d.day]
                                );
                              }}
                              className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '4px 10px' }}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Confirmar Agendamento
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Cancel with reason */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancelar Reserva"
      >
        {cancellingRes && (
          <div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Você está prestes a cancelar a reserva <strong>{cancellingRes.title}</strong> para{' '}
              <strong>{cancellingRes.resourceName}</strong> em {cancellingRes.date} ({cancellingRes.startTime} - {cancellingRes.endTime}).
            </p>

            <div className="form-group">
              <label className="form-label">Justificativa do Cancelamento *</label>
              <textarea
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Aula prática remarcada para o auditório ou imprevisto..."
                className="form-textarea"
              />
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--success)',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
              }}
            >
              ℹ️ O cancelamento liberará o horário imediatamente e notificará o próximo candidato da fila de espera.
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button type="button" onClick={() => setIsCancelModalOpen(false)} className="btn btn-secondary">
                Voltar
              </button>
              <button type="button" onClick={handleConfirmCancel} className="btn btn-danger">
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
