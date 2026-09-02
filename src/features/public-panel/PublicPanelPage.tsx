import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import { labRepo, equipmentRepo, reservationRepo } from '../../infrastructure/mocks/repositories';
import type { Laboratory } from '../../domain/laboratories/types';
import type { Equipment } from '../../domain/equipment/types';
import type { Reservation } from '../../domain/reservations/types';
import { Badge } from '../../components/common/Badge';
import {
  Tv,
  Clock,
  Users,
  MapPin,
  Cpu,
  AlertCircle,
  Wifi,
  Sparkles,
} from 'lucide-react';

export const PublicPanelPage: React.FC = () => {
  const { refreshTrigger } = useApp();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [l, e, r] = await Promise.all([
          labRepo.findAll(),
          equipmentRepo.findAll(),
          reservationRepo.findAll(),
        ]);
        setLabs(l);
        setEquipmentList(e);
        setReservations(r);
      } catch {
        // ignore
      }
    };
    load();
  }, [refreshTrigger]);

  const todayStr = currentTime.toISOString().split('T')[0];
  const timeFormatted = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateFormatted = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const availableOsc = equipmentList.filter((e) => e.category === 'osciloscopio' && e.status === 'available').length;
  const availableIoT = equipmentList.filter((e) => e.category === 'prototipagem' && e.status === 'available').length;
  const availableVR = equipmentList.filter((e) => e.category === 'vr_ar' && e.status === 'available').length;

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #05080e 0%, #0a0f1d 100%)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        boxShadow: '0 0 50px rgba(0, 240, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: '26px',
      }}
    >
      {/* Kiosk Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(99, 102, 241, 0.4))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              boxShadow: '0 0 20px var(--primary-glow)',
            }}
          >
            <Tv size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
                PAINEL PÚBLICO DOS LABORATÓRIOS
              </h2>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="pulse-dot" style={{ background: '#34d399' }}></span>
                TRANSMISSÃO EM TEMPO REAL
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {dateFormatted}
            </p>
          </div>
        </div>

        {/* Digital Clock */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 20px',
            textAlign: 'right',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.15)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.2rem',
              fontWeight: 800,
              color: 'var(--primary)',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
            }}
          >
            {timeFormatted}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HORÁRIO DE BRASÍLIA</span>
        </div>
      </div>

      {/* Equipment Counters Quick Ticker */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={20} color="var(--primary)" />
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Osciloscópios no Balcão:</span>
            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
              {availableOsc} unidades livres
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color="#10b981" />
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Kits Raspberry Pi & IoT:</span>
            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>
              {availableIoT} kits disponíveis
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Wifi size={20} color="#818cf8" />
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Óculos VR / Realidade Virtual:</span>
            <div style={{ fontWeight: 800, color: '#818cf8', fontSize: '1.1rem' }}>
              {availableVR} óculos prontos
            </div>
          </div>
        </div>
      </div>

      {/* Laboratories Live Occupancy Grid */}
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="var(--primary)" /> Status Atual das Salas & Laboratórios
        </h3>

        <div className="grid-2">
          {labs.map((lab) => {
            const isAvailable = lab.status === 'available';
            const isOccupied = lab.status === 'occupied';

            // Find next reservation for today
            const nextRes = reservations
              .filter(
                (r) =>
                  r.resourceId === lab.id &&
                  r.date === todayStr &&
                  r.status !== 'cancelled'
              )
              .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

            return (
              <div
                key={lab.id}
                style={{
                  background: isOccupied
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(26, 36, 60, 0.95))'
                    : isAvailable
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(16, 44, 40, 0.95))'
                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(45, 20, 25, 0.95))',
                  border: `1px solid ${
                    isOccupied
                      ? 'rgba(0, 240, 255, 0.35)'
                      : isAvailable
                      ? 'rgba(16, 185, 129, 0.35)'
                      : 'rgba(244, 63, 94, 0.35)'
                  }`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 800 }}>
                      {lab.code}
                    </span>
                    <h4 style={{ fontSize: '1.25rem', marginTop: '2px' }}>{lab.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} /> {lab.location} • <Users size={14} /> {lab.capacity} lugares
                    </div>
                  </div>
                  <Badge status={lab.status} />
                </div>

                {/* Current Activity Box */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ATIVIDADE AGORA:
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {lab.currentActivity || 'Livre para Estudos / Sem Aula Agendada'}
                  </div>
                  {lab.currentOccupant && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--primary)', marginTop: '4px' }}>
                      Docente Responsável: <strong>{lab.currentOccupant}</strong>
                    </div>
                  )}
                </div>

                {/* Next scheduled slot */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="var(--primary)" />
                  {nextRes ? (
                    <span>
                      Próxima atividade: <strong>{nextRes.startTime} - {nextRes.endTime}</strong> ({nextRes.title})
                    </span>
                  ) : (
                    <span>Nenhum outro agendamento programado para hoje.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Institutional Announcement Bar */}
      <div
        style={{
          background: 'rgba(0, 240, 255, 0.08)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.84rem',
        }}
      >
        <AlertCircle size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Aviso Institucional:</strong> É obrigatório o uso de calçado fechado e crachá de identificação nos laboratórios Maker e de Soldagem ESD. Agendamentos pelo portal fecham 1h antes do horário.
        </span>
      </div>
    </div>
  );
};
