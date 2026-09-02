import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import { auditRepo } from '../../infrastructure/mocks/repositories';
import type { AuditLogEntry } from '../../domain/audit/types';
import {
  FileText,
  Search,
  Download,
  Filter,
  Sliders,
  Clock,
  AlertOctagon,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const {
    scenario,
    loadScenario,
    latencyMs,
    setLatencyMs,
    simulateError,
    setSimulateError,
    showToast,
    refreshTrigger,
  } = useApp();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await auditRepo.findAll();
      setLogs(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar auditoria';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labtech-audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Logs de auditoria exportados com sucesso!', 'success');
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText color="var(--primary)" /> Trilha de Auditoria & Gerenciador de Cenários
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Rastreamento completo e imutável de todas as transações, agendamentos, custódia e controle do motor de mock.
          </p>
        </div>

        <button onClick={handleExportJSON} className="btn btn-secondary">
          <Download size={16} /> Exportar Auditoria (JSON)
        </button>
      </div>

      {/* Scenario Control Panel Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(19, 29, 54, 0.95) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Sliders size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem' }}>Gerenciamento de Cenários de Teste (Mock Engine)</h3>
        </div>

        <div className="grid-3">
          {/* Default Scenario */}
          <div
            onClick={() => loadScenario('default')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: scenario === 'default' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${scenario === 'default' ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: scenario === 'default' ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.94rem' }}>
                1. Cenário Padrão
              </strong>
              {scenario === 'default' && <span className="badge badge-confirmed">ATIVO</span>}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Conjunto balanceado com laboratórios equipados, reservas ativas, fila de espera e ordens de manutenção em andamento.
            </p>
          </div>

          {/* High Conflict Scenario */}
          <div
            onClick={() => loadScenario('high_conflict')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: scenario === 'high_conflict' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${scenario === 'high_conflict' ? 'var(--warning)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: scenario === 'high_conflict' ? 'var(--warning)' : 'var(--text-main)', fontSize: '0.94rem' }}>
                2. Alta Ocupação & Conflitos
              </strong>
              {scenario === 'high_conflict' && <span className="badge badge-waiting">ATIVO</span>}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Laboratórios totalmente ocupados para hoje, ideal para testar bloqueios de conflito de horário e o fluxo de fila de espera.
            </p>
          </div>

          {/* Empty Scenario */}
          <div
            onClick={() => loadScenario('empty')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: scenario === 'empty' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${scenario === 'empty' ? 'var(--secondary)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: scenario === 'empty' ? '#818cf8' : 'var(--text-main)', fontSize: '0.94rem' }}>
                3. Base Limpa (Vazia)
              </strong>
              {scenario === 'empty' && <span className="badge badge-occupied">ATIVO</span>}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Remove todas as reservas, empréstimos e ordens de manutenção, mantendo apenas o catálogo base para cadastro manual.
            </p>
          </div>
        </div>

        {/* Sliders & Fault Injection in panel */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Latência de Rede Simulada: <strong>{latencyMs}ms</strong>
            </span>
            <input
              type="range"
              min="0"
              max="1500"
              step="100"
              value={latencyMs}
              onChange={(e) => setLatencyMs(Number(e.target.value))}
              style={{ width: '120px', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem' }}>
            <input
              type="checkbox"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
              style={{ accentColor: 'var(--danger)', cursor: 'pointer' }}
            />
            <AlertOctagon size={16} color="var(--danger)" />
            <span style={{ color: simulateError ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: simulateError ? 700 : 400 }}>
              Simular Falha Global de Servidor (HTTP 500 Mock Error)
            </span>
          </label>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Pesquisar por detalhes, usuário ou ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Filtrar por Ação:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="all">Todas as Ações</option>
            <option value="AUTH">Autenticação / Sessão</option>
            <option value="LAB">Laboratórios</option>
            <option value="EQUIPMENT">Equipamentos</option>
            <option value="RESERVATION">Reservas</option>
            <option value="WAITLIST">Fila de Espera</option>
            <option value="CUSTODY">Custódia & Balcão</option>
            <option value="MAINTENANCE">Manutenção</option>
            <option value="SCENARIO">Cenários Mock</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Carregando trilha de auditoria...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Nenhum evento registrado com os filtros informados.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Ação</th>
                  <th>Usuário / Perfil</th>
                  <th>Entidade</th>
                  <th>Detalhes da Operação</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} color="var(--primary)" />
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          background: 'rgba(0, 240, 255, 0.1)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(0, 240, 255, 0.25)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{log.userName}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {log.userRole?.toUpperCase()}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        {log.entityType} ({log.entityId})
                      </span>
                    </td>

                    <td style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
