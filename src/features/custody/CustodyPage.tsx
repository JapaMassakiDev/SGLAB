import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import {
  custodyRepo,
  equipmentRepo,
} from '../../infrastructure/mocks/repositories';
import type { CustodyRecord } from '../../domain/custody/types';
import type { Equipment } from '../../domain/equipment/types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  ClipboardCheck,
  CheckSquare,
  Square,
  FileSignature,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';

export const CustodyPage: React.FC = () => {
  const { currentUser, allUsers, showToast, refreshTrigger } = useApp();
  const [records, setRecords] = useState<CustodyRecord[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'checkout'>('loans');
  const [loading, setLoading] = useState(false);

  // Check-out Form State
  const [selectedEqId, setSelectedEqId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [expectedReturnTime, setExpectedReturnTime] = useState('18:00');
  const [initialCondition, setInitialCondition] = useState('Equipamento limpo, testado e em perfeito funcionamento.');
  const [checkedAccessories, setCheckedAccessories] = useState<string[]>([]);
  const [signatureSigned, setSignatureSigned] = useState(false);

  // Check-in (Devolução) Modal State
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedRecordForCheckin, setSelectedRecordForCheckin] = useState<CustodyRecord | null>(null);
  const [returnNotes, setReturnNotes] = useState('Equipamento devolvido íntegro.');
  const [hasDamage, setHasDamage] = useState(false);
  const [damageSeverity, setDamageSeverity] = useState<'light' | 'moderate' | 'severe'>('moderate');
  const [damageReport, setDamageReport] = useState('');

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recList, eqList] = await Promise.all([
        custodyRepo.findAll(),
        equipmentRepo.findAll(),
      ]);
      setRecords(recList.sort((a, b) => b.checkoutDate.localeCompare(a.checkoutDate)));
      setEquipmentList(eqList);

      const availableItems = eqList.filter((e) => e.status === 'available');
      if (availableItems.length > 0 && !selectedEqId) {
        setSelectedEqId(availableItems[0].id);
        setCheckedAccessories([...availableItems[0].accessories]);
      }
      if (allUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(allUsers[allUsers.length - 1].id); // Lucas (aluno)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar registros de custódia';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentSelect = (eqId: string) => {
    setSelectedEqId(eqId);
    const eq = equipmentList.find((e) => e.id === eqId);
    if (eq) {
      setCheckedAccessories([...eq.accessories]);
    }
  };

  const toggleAccessory = (acc: string) => {
    setCheckedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  const handlePerformCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipmentList.find((item) => item.id === selectedEqId);
    const borrower = allUsers.find((u) => u.id === selectedUserId);

    if (!eq || !borrower) {
      showToast('Selecione o equipamento e o responsável', 'warning');
      return;
    }

    if (!signatureSigned) {
      showToast('O termo de responsabilidade precisa ser assinado digitalmente', 'warning');
      return;
    }

    try {
      await custodyRepo.checkout({
        equipmentId: eq.id,
        equipmentName: eq.name,
        equipmentTag: eq.tag,
        userId: borrower.id,
        userName: borrower.name,
        userRole: borrower.role,
        userEmail: borrower.email,
        technicianId: currentUser.id,
        technicianName: currentUser.name,
        checkoutDate: new Date().toISOString(),
        expectedReturnDate: `${expectedReturnDate}T${expectedReturnTime}:00Z`,
        accessoriesChecked: checkedAccessories,
        initialConditionNotes: initialCondition,
        signatureSimulated: true,
        hasDamage: false,
      });

      showToast(`Retirada de ${eq.tag} registrada para ${borrower.name}!`, 'success');
      setActiveSubTab('loans');
      setSignatureSigned(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar retirada';
      showToast(msg, 'error');
    }
  };

  const handlePerformCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForCheckin) return;

    try {
      await custodyRepo.checkin(
        selectedRecordForCheckin.id,
        returnNotes,
        hasDamage,
        hasDamage ? `[${damageSeverity.toUpperCase()}] ${damageReport}` : undefined
      );

      if (hasDamage) {
        showToast(
          'Devolução com avaria registrada! Uma ordem de serviço de manutenção foi aberta automaticamente.',
          'warning'
        );
      } else {
        showToast('Equipamento devolvido com sucesso e liberado para novo uso!', 'success');
      }

      setIsCheckinModalOpen(false);
      setSelectedRecordForCheckin(null);
      setHasDamage(false);
      setDamageReport('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar devolução';
      showToast(msg, 'error');
    }
  };

  const activeLoans = records.filter((r) => r.status === 'active' || r.status === 'late');
  const availableEquipments = equipmentList.filter((e) => e.status === 'available');
  const selectedEquipment = equipmentList.find((e) => e.id === selectedEqId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCheck color="var(--primary)" /> Balcão de Custódia & Empréstimos
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Terminal de check-out, checklist de conferência de acessórios, assinatura de termo e registro de devolução com inspeção.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveSubTab('loans')}
            className={`btn ${activeSubTab === 'loans' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Empréstimos Ativos ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveSubTab('checkout')}
            className={`btn ${activeSubTab === 'checkout' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <PlusCircle size={16} /> Nova Retirada
          </button>
        </div>
      </div>

      {activeSubTab === 'loans' ? (
        /* Active Loans Table */
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Empréstimos em Andamento & Histórico Recente</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total: {records.length} registros
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Carregando registros...
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              Nenhum registro de custódia encontrado.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th>Responsável / Solicitante</th>
                    <th>Data Retirada</th>
                    <th>Devolução Prevista</th>
                    <th>Acessórios Conferidos</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const isLate =
                      rec.status === 'active' &&
                      new Date().getTime() > new Date(rec.expectedReturnDate).getTime();

                    return (
                      <tr key={rec.id}>
                        <td>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                              {rec.equipmentTag}
                            </span>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{rec.equipmentName}</div>
                          </div>
                        </td>

                        <td>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{rec.userName}</div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {rec.userRole.toUpperCase()} • {rec.userEmail}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.82rem' }}>
                            {new Date(rec.checkoutDate).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(rec.checkoutDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Operador: {rec.technicianName}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.82rem', color: isLate ? 'var(--danger)' : 'var(--text-main)', fontWeight: isLate ? 700 : 400 }}>
                            {new Date(rec.expectedReturnDate).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(rec.expectedReturnDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {isLate && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={11} /> Prazo expirado
                            </span>
                          )}
                        </td>

                        <td>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {rec.accessoriesChecked.length} itens checados
                          </span>
                        </td>

                        <td>
                          <Badge status={isLate ? 'late' : rec.status} />
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          {rec.status === 'active' || rec.status === 'late' ? (
                            <button
                              onClick={() => {
                                setSelectedRecordForCheckin(rec);
                                setIsCheckinModalOpen(true);
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              <RotateCcw size={14} /> Receber Devolução
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Concluído
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
      ) : (
        /* Check-out Terminal Form */
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle color="var(--primary)" /> Nova Retirada no Balcão de Custódia
          </h3>

          <form onSubmit={handlePerformCheckout}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Selecione o Equipamento Disponível *</label>
                <select
                  value={selectedEqId}
                  onChange={(e) => handleEquipmentSelect(e.target.value)}
                  className="form-select"
                  required
                >
                  {availableEquipments.length === 0 ? (
                    <option value="">Nenhum equipamento disponível no momento</option>
                  ) : (
                    availableEquipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.tag} — {eq.name} ({eq.brand})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Responsável / Usuário Solicitante *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="form-select"
                  required
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Data Prevista para Devolução *</label>
                <input
                  type="date"
                  required
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário Limite *</label>
                <input
                  type="time"
                  required
                  value={expectedReturnTime}
                  onChange={(e) => setExpectedReturnTime(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Checklist of accessories */}
            {selectedEquipment && selectedEquipment.accessories.length > 0 && (
              <div
                style={{
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <label className="form-label" style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                  Conferência Obrigatória de Acessórios (Checklist Físico):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {selectedEquipment.accessories.map((acc) => {
                    const isChecked = checkedAccessories.includes(acc);
                    return (
                      <div
                        key={acc}
                        onClick={() => toggleAccessory(acc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          color: isChecked ? 'var(--text-main)' : 'var(--text-muted)',
                        }}
                      >
                        {isChecked ? (
                          <CheckSquare size={18} color="var(--primary)" />
                        ) : (
                          <Square size={18} />
                        )}
                        <span>{acc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Condição Inicial / Observações Técnicas</label>
              <textarea
                value={initialCondition}
                onChange={(e) => setInitialCondition(e.target.value)}
                className="form-textarea"
              />
            </div>

            {/* Simulated Digital Signature */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileSignature size={18} color="var(--primary)" />
                <strong style={{ fontSize: '0.88rem' }}>Termo de Responsabilidade & Custódia</strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '12px' }}>
                O solicitante declara receber o item acima em perfeito estado de conservação e compromete-se a devolvê-lo na data estipulada com todos os acessórios relacionados.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={signatureSigned}
                  onChange={(e) => setSignatureSigned(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                  Assinatura Digital Simulada Confirmada pelo Responsável
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setActiveSubTab('loans')} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={availableEquipments.length === 0}
              >
                Concluir Retirada (Check-out)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Check-in / Return */}
      <Modal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        title="Recepção de Devolução de Equipamento"
      >
        {selectedRecordForCheckin && (
          <form onSubmit={handlePerformCheckin}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.85rem',
              }}
            >
              <div><strong>Equipamento:</strong> {selectedRecordForCheckin.equipmentName} ({selectedRecordForCheckin.equipmentTag})</div>
              <div><strong>Responsável:</strong> {selectedRecordForCheckin.userName}</div>
              <div><strong>Data Empréstimo:</strong> {new Date(selectedRecordForCheckin.checkoutDate).toLocaleDateString('pt-BR')}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Parecer de Inspeção na Devolução *</label>
              <textarea
                required
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="form-textarea"
              />
            </div>

            {/* Damage Toggle */}
            <div
              style={{
                background: hasDamage ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${hasDamage ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '16px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasDamage}
                  onChange={(e) => setHasDamage(e.target.checked)}
                  style={{ accentColor: 'var(--danger)' }}
                />
                <strong style={{ fontSize: '0.86rem', color: hasDamage ? 'var(--danger)' : 'var(--text-main)' }}>
                  ⚠️ Registrar Avaria / Defeito no Equipamento
                </strong>
              </label>

              {hasDamage && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Gravidade do Dano</label>
                    <select
                      value={damageSeverity}
                      onChange={(e) => setDamageSeverity(e.target.value as any)}
                      className="form-select"
                    >
                      <option value="light">Leve (Riscos estéticos, cabo desgastado)</option>
                      <option value="moderate">Moderada (Mau contato, conector danificado)</option>
                      <option value="severe">Grave (Aparelho inoperante, tela trincada)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Relatório Circunstanciado de Avaria *</label>
                    <textarea
                      required={hasDamage}
                      value={damageReport}
                      onChange={(e) => setDamageReport(e.target.value)}
                      placeholder="Descreva detalhadamente o dano para encaminhamento à manutenção..."
                      className="form-textarea"
                    />
                  </div>

                  <p style={{ fontSize: '0.74rem', color: 'var(--danger)' }}>
                    Ao registrar a avaria, o equipamento será imediatamente bloqueado para novos agendamentos e uma Ordem de Serviço (OS) de manutenção preventiva/corretiva será aberta.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button type="button" onClick={() => setIsCheckinModalOpen(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className={`btn ${hasDamage ? 'btn-danger' : 'btn-primary'}`}>
                Finalizar Devolução
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
