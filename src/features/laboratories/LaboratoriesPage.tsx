import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import { labRepo, reservationRepo } from '../../infrastructure/mocks/repositories';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Reservation } from '../../domain/reservations/types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Layers,
  Search,
  Plus,
  Calendar,
  Users,
  Monitor,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const LaboratoriesPage: React.FC = () => {
  const { hasPermission, showToast, setActiveTab, refreshTrigger } = useApp();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLabForSchedule, setSelectedLabForSchedule] = useState<Laboratory | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Lab Form State
  const [newLabName, setNewLabName] = useState('');
  const [newLabCode, setNewLabCode] = useState('');
  const [newLabCapacity, setNewLabCapacity] = useState(24);
  const [newLabComputers, setNewLabComputers] = useState(20);
  const [newLabLocation, setNewLabLocation] = useState('');
  const [newLabDesc, setNewLabDesc] = useState('');
  const [newLabSupervisor, setNewLabSupervisor] = useState('');
  const [newLabSoftwares, setNewLabSoftwares] = useState('Ubuntu, VS Code, Python');

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [labList, resList] = await Promise.all([
        labRepo.findAll(),
        reservationRepo.findAll(),
      ]);
      setLabs(labList);
      setReservations(resList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar laboratórios';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName || !newLabCode) {
      showToast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    try {
      await labRepo.create({
        name: newLabName,
        code: newLabCode,
        capacity: Number(newLabCapacity),
        computersCount: Number(newLabComputers),
        location: newLabLocation || 'Bloco A',
        status: 'available',
        description: newLabDesc || 'Laboratório de tecnologia aplicada',
        installedSoftware: newLabSoftwares.split(',').map((s) => s.trim()),
        equipmentCount: 10,
        supervisorName: newLabSupervisor || 'Coordenação',
        openTime: '07:30',
        closeTime: '22:30',
        tags: ['Tecnologia', 'Inovação'],
      });

      showToast(`Laboratório ${newLabCode} cadastrado com sucesso!`, 'success');
      setIsAddModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar laboratório';
      showToast(msg, 'error');
    }
  };

  const filteredLabs = labs.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableCount = labs.filter((l) => l.status === 'available').length;
  const occupiedCount = labs.filter((l) => l.status === 'occupied').length;
  const maintenanceCount = labs.filter((l) => l.status === 'maintenance' || l.status === 'closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers color="var(--primary)" /> Laboratórios de Tecnologia
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Consulte a capacidade, softwares instalados, ocupação em tempo real e grade horária.
          </p>
        </div>

        {hasPermission('manage_labs') && (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Novo Laboratório
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid-4">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)' }}>
            <Layers size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total de Labs
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>{labs.length}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Disponíveis
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{availableCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ocupados Agora
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)' }}>{occupiedCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Em Manutenção
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--danger)' }}>{maintenanceCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, código ou localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
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
            <option value="available">Disponíveis</option>
            <option value="occupied">Ocupados</option>
            <option value="maintenance">Em Manutenção</option>
          </select>
        </div>
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Carregando laboratórios...
        </div>
      ) : filteredLabs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Nenhum laboratório encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid-2">
          {filteredLabs.map((lab) => {
            const labReservations = reservations.filter(
              (r) => r.resourceId === lab.id && r.status !== 'cancelled'
            );

            return (
              <div key={lab.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.06em' }}>
                      {lab.code}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', marginTop: '2px' }}>{lab.name}</h3>
                  </div>
                  <Badge status={lab.status} />
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {lab.description}
                </p>

                {/* Features & Specs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <MapPin size={15} color="var(--primary)" />
                    <span>{lab.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Users size={15} color="var(--primary)" />
                    <span>{lab.capacity} lugares ({lab.computersCount} PCs)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Clock size={15} color="var(--primary)" />
                    <span>{lab.openTime} às {lab.closeTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Monitor size={15} color="var(--primary)" />
                    <span>{lab.supervisorName}</span>
                  </div>
                </div>

                {/* Current Status Box */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <strong style={{ color: 'var(--text-secondary)' }}>Atividade Atual: </strong>
                  <span style={{ color: lab.currentActivity ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {lab.currentActivity || 'Nenhuma aula em andamento'}
                  </span>
                  {lab.currentOccupant && (
                    <div style={{ marginTop: '2px', color: 'var(--primary)', fontSize: '0.76rem' }}>
                      Responsável: {lab.currentOccupant}
                    </div>
                  )}
                </div>

                {/* Softwares */}
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    SOFTWARES HOMOLOGADOS:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {lab.installedSoftware.map((sw, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                  <button
                    onClick={() => setSelectedLabForSchedule(lab)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Calendar size={14} /> Grade do Dia ({labReservations.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('reservations')}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={lab.status === 'closed' || lab.status === 'maintenance'}
                  >
                    Agendar Horário
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Schedule Timeline */}
      <Modal
        isOpen={!!selectedLabForSchedule}
        onClose={() => setSelectedLabForSchedule(null)}
        title={`Grade de Ocupação: ${selectedLabForSchedule?.name} (${selectedLabForSchedule?.code})`}
      >
        {selectedLabForSchedule && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Horário de funcionamento: {selectedLabForSchedule.openTime} às {selectedLabForSchedule.closeTime}.
              Local: {selectedLabForSchedule.location}.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.95rem' }}>Reservas Agendadas:</h4>
              {reservations.filter(
                (r) => r.resourceId === selectedLabForSchedule.id && r.status !== 'cancelled'
              ).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                  Nenhum agendamento ativo para este laboratório hoje. Todos os horários estão livres.
                </div>
              ) : (
                reservations
                  .filter((r) => r.resourceId === selectedLabForSchedule.id && r.status !== 'cancelled')
                  .map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(0, 240, 255, 0.06)',
                        border: '1px solid rgba(0, 240, 255, 0.25)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                            {r.startTime} — {r.endTime}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({r.date})</span>
                          {r.isRecurring && (
                            <span style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                              Recorrente
                            </span>
                          )}
                        </div>
                        <h5 style={{ fontSize: '0.92rem', marginTop: '4px' }}>{r.title}</h5>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Responsável: {r.userName} ({r.userRole.toUpperCase()}) • {r.purpose}
                        </p>
                      </div>
                      <Badge status={r.status} />
                    </div>
                  ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setSelectedLabForSchedule(null);
                  setActiveTab('reservations');
                }}
                className="btn btn-primary"
              >
                Criar Nova Reserva neste Lab
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add Laboratory */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Novo Laboratório"
      >
        <form onSubmit={handleCreateLab}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nome do Laboratório *</label>
              <input
                type="text"
                required
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                placeholder="Ex: Lab de Sistemas Embarcados"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Código / Sigla *</label>
              <input
                type="text"
                required
                value={newLabCode}
                onChange={(e) => setNewLabCode(e.target.value)}
                placeholder="Ex: LAB-EMB-103"
                className="form-input"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Capacidade (Alunos)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newLabCapacity}
                onChange={(e) => setNewLabCapacity(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Computadores Disponíveis</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newLabComputers}
                onChange={(e) => setNewLabComputers(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Localização no Campus</label>
            <input
              type="text"
              value={newLabLocation}
              onChange={(e) => setNewLabLocation(e.target.value)}
              placeholder="Ex: Bloco B — 2º Andar, Sala 204"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Softwares Homologados (separados por vírgula)</label>
            <input
              type="text"
              value={newLabSoftwares}
              onChange={(e) => setNewLabSoftwares(e.target.value)}
              placeholder="Ex: MATLAB, Python 3.12, Quartus Prime, VS Code"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Responsável / Supervisor</label>
            <input
              type="text"
              value={newLabSupervisor}
              onChange={(e) => setNewLabSupervisor(e.target.value)}
              placeholder="Ex: Prof. Roberto Alencar"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição das Atividades</label>
            <textarea
              value={newLabDesc}
              onChange={(e) => setNewLabDesc(e.target.value)}
              placeholder="Descreva as características técnicas e recursos disponíveis..."
              className="form-textarea"
            />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Cadastrar Laboratório
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
