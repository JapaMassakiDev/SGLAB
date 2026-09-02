import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import {
  maintenanceRepo,
  equipmentRepo,
} from '../../infrastructure/mocks/repositories';
import type {
  MaintenanceOrder,
  MaintenancePriority,
  MaintenanceStatus,
} from '../../domain/maintenance/types';
import type { Equipment } from '../../domain/equipment/types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const { currentUser, showToast, refreshTrigger } = useApp();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // New Order Form
  const [selectedEqId, setSelectedEqId] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [problemDescription, setProblemDescription] = useState('');
  const [title, setTitle] = useState('');

  // Update Status Form
  const [newStatus, setNewStatus] = useState<MaintenanceStatus>('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [technicianName, setTechnicianName] = useState(currentUser.name);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordList, eqList] = await Promise.all([
        maintenanceRepo.findAll(),
        equipmentRepo.findAll(),
      ]);
      setOrders(ordList.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)));
      setEquipmentList(eqList);
      if (eqList.length > 0 && !selectedEqId) {
        setSelectedEqId(eqList[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar manutenções';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipmentList.find((item) => item.id === selectedEqId);
    if (!eq) return;

    try {
      await maintenanceRepo.create({
        title: title || `Reparo de ${eq.name}`,
        equipmentId: eq.id,
        equipmentName: eq.name,
        equipmentTag: eq.tag,
        reportedBy: currentUser.name,
        assignedTechnicianName: 'Ana Silva Santos',
        priority,
        status: 'open',
        problemDescription,
      });

      showToast(`Ordem de serviço criada e ${eq.tag} bloqueado para manutenção!`, 'success');
      setIsAddModalOpen(false);
      setTitle('');
      setProblemDescription('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir OS';
      showToast(msg, 'error');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await maintenanceRepo.updateStatus(
        selectedOrder.id,
        newStatus,
        resolutionNotes,
        technicianName
      );

      if (newStatus === 'resolved') {
        showToast(`OS ${selectedOrder.orderNumber} resolvida! Equipamento liberado para uso.`, 'success');
      } else {
        showToast(`OS ${selectedOrder.orderNumber} atualizada para ${newStatus.toUpperCase()}`, 'info');
      }

      setIsUpdateModalOpen(false);
      setSelectedOrder(null);
      setResolutionNotes('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar OS';
      showToast(msg, 'error');
    }
  };

  const filtered = orders.filter((o) => {
    return statusFilter === 'all' || o.status === statusFilter;
  });

  const openCount = orders.filter((o) => o.status === 'open').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress' || o.status === 'waiting_parts').length;
  const resolvedCount = orders.filter((o) => o.status === 'resolved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wrench color="var(--primary)" /> Gestão de Manutenção & Chamados Técnicos
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Abertura de ordens de serviço (OS), triagem de avarias, histórico técnico e liberação de equipamentos reparados.
          </p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Abrir Chamado (OS)
        </button>
      </div>

      {/* Metrics */}
      <div className="grid-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Chamados Abertos
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--danger)' }}>{openCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Em Andamento / Aguardando Peça
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--warning)' }}>{inProgressCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Concluídas / Liberadas
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{resolvedCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Filter size={16} color="var(--primary)" />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status da OS:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto' }}
        >
          <option value="all">Todas as Ordens</option>
          <option value="open">Abertas</option>
          <option value="in_progress">Em Andamento</option>
          <option value="waiting_parts">Aguardando Peças</option>
          <option value="resolved">Resolvidas</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Carregando ordens de serviço...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Nenhuma ordem de serviço encontrada.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ordem & Equipamento</th>
                  <th>Prioridade</th>
                  <th>Problema / Diagnóstico</th>
                  <th>Responsável Técnico</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700 }}>
                          {order.orderNumber}
                        </span>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {order.equipmentName} ({order.equipmentTag})
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Aberta em {new Date(order.reportedAt).toLocaleDateString('pt-BR')} por {order.reportedBy}
                        </span>
                      </div>
                    </td>

                    <td>
                      <Badge status={order.priority} label={order.priority.toUpperCase()} />
                    </td>

                    <td style={{ maxWidth: '320px' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                        {order.problemDescription}
                      </p>
                      {order.diagnosis && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px' }}>
                          <strong>Diag:</strong> {order.diagnosis}
                        </p>
                      )}
                      {order.resolutionNotes && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '2px' }}>
                          <strong>Solução:</strong> {order.resolutionNotes}
                        </p>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        {order.assignedTechnicianName || 'Não atribuído'}
                      </div>
                      {order.downtimeHours && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          Tempo parado: {order.downtimeHours}h
                        </span>
                      )}
                    </td>

                    <td>
                      <Badge status={order.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewStatus(order.status);
                          setResolutionNotes(order.resolutionNotes || '');
                          setIsUpdateModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Atualizar Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Open Maintenance Order */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Abrir Ordem de Serviço (OS)"
      >
        <form onSubmit={handleCreateOrder}>
          <div className="form-group">
            <label className="form-label">Equipamento que Necessita Reparo *</label>
            <select
              value={selectedEqId}
              onChange={(e) => setSelectedEqId(e.target.value)}
              className="form-select"
              required
            >
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.tag} — {eq.name} ({eq.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Título do Chamado *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Falha na fonte de alimentação"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nível de Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="form-select"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta (Urgente)</option>
                <option value="critical">Crítica (Interrupção de aulas)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição dos Sintomas / Defeito *</label>
            <textarea
              required
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Descreva o comportamento anômalo observado..."
              className="form-textarea"
            />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Abrir Ordem de Serviço
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Status */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={`Atualizar OS: ${selectedOrder?.orderNumber}`}
      >
        {selectedOrder && (
          <form onSubmit={handleUpdateStatus}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <strong>{selectedOrder.equipmentName} ({selectedOrder.equipmentTag})</strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Problema reportado: {selectedOrder.problemDescription}
              </p>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Novo Status da Ordem</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="form-select"
                >
                  <option value="open">Aberta</option>
                  <option value="in_progress">Em Andamento / Reparo</option>
                  <option value="waiting_parts">Aguardando Peças de Reposição</option>
                  <option value="resolved">Resolvida (Liberar Equipamento)</option>
                  <option value="discarded">Baixado / Descarte Definitivo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Técnico Responsável</label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Parecer Técnico / Solução Aplicada</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detalhes da intervenção realizada, peças trocadas ou testes efetuados..."
                className="form-textarea"
              />
            </div>

            {newStatus === 'resolved' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginBottom: '16px' }}>
                ✓ Ao marcar como Resolvida, o status do equipamento retornará automaticamente para <strong>Disponível</strong>.
              </div>
            )}

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
