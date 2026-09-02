import React from 'react';
import { useApp } from '../../app/AppContext';
import type { Role } from '../../domain/auth/types';
import type { ScenarioName } from '../../infrastructure/storage/store';
import { ShieldCheck, Wrench, GraduationCap, UserCircle, RefreshCw, AlertOctagon, Sliders } from 'lucide-react';

export const MockControlBar: React.FC = () => {
  const {
    currentUser,
    switchUserRole,
    scenario,
    loadScenario,
    latencyMs,
    setLatencyMs,
    simulateError,
    setSimulateError,
  } = useApp();

  const personas: { role: Role; label: string; icon: React.ReactNode }[] = [
    { role: 'admin', label: 'Admin (Marcelo)', icon: <ShieldCheck size={14} /> },
    { role: 'technician', label: 'Técnico (Ana)', icon: <Wrench size={14} /> },
    { role: 'teacher', label: 'Professor (Roberto)', icon: <GraduationCap size={14} /> },
    { role: 'student', label: 'Aluno (Lucas)', icon: <UserCircle size={14} /> },
  ];

  return (
    <div className="mock-control-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="mock-badge">
          <Sliders size={12} /> Mock Engine LabTech
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
          Persona Ativa:
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {personas.map((p) => {
            const isActive = currentUser.role === p.role;
            return (
              <button
                key={p.role}
                onClick={() => switchUserRole(p.role)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-full)',
                }}
                title={`Alternar para ${p.label}`}
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mock-controls-group">
        {/* Scenario Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>Cenário:</span>
          <select
            value={scenario}
            onChange={(e) => loadScenario(e.target.value as ScenarioName)}
            className="form-select"
            style={{
              padding: '3px 8px',
              fontSize: '0.75rem',
              width: 'auto',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <option value="default">Padrão (Completo)</option>
            <option value="high_conflict">Alta Ocupação / Conflitos</option>
            <option value="empty">Base Limpa (Vazia)</option>
          </select>
          <button
            onClick={() => loadScenario(scenario)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '3px 6px' }}
            title="Resetar dados do cenário"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Latency Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
            Latência: <strong>{latencyMs}ms</strong>
          </span>
          <input
            type="range"
            min="0"
            max="1200"
            step="100"
            value={latencyMs}
            onChange={(e) => setLatencyMs(Number(e.target.value))}
            style={{ width: '70px', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Error Toggle */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: simulateError ? 'var(--danger)' : 'var(--text-secondary)',
            fontWeight: simulateError ? 700 : 400,
          }}
        >
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
            style={{ accentColor: 'var(--danger)', cursor: 'pointer' }}
          />
          <AlertOctagon size={13} />
          <span>Simular Erro 500</span>
        </label>
      </div>
    </div>
  );
};
