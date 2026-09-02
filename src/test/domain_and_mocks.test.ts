import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '../infrastructure/storage/store';
import {
  authRepo,
  labRepo,
  equipmentRepo,
  reservationRepo,
  waitlistRepo,
  custodyRepo,
  maintenanceRepo,
} from '../infrastructure/mocks/repositories';
import { latencyConfig } from '../infrastructure/latency/simulator';

describe('LabTech Mock Engine & Domain Rules', () => {
  beforeEach(() => {
    // Reset to default scenario before each test and disable artificial delays for fast tests
    mockStore.loadScenario('default');
    latencyConfig.setLatency(0);
    latencyConfig.setErrorSimulation(false);
  });

  describe('Increment 01 — Sessão, Perfis e Permissões', () => {
    it('deve carregar usuário inicial como Admin e permitir alternar perfis', async () => {
      const initialUser = await authRepo.getCurrentUser();
      expect(initialUser.role).toBe('admin');
      expect(initialUser.permissions).toContain('manage_labs');

      const studentUser = await authRepo.switchUser('student');
      expect(studentUser.role).toBe('student');
      expect(studentUser.permissions).toContain('create_reservation');
      expect(studentUser.permissions).not.toContain('manage_labs');
      expect(studentUser.permissions).not.toContain('manage_maintenance');
    });
  });

  describe('Increment 02 & 03 — Laboratórios e Equipamentos', () => {
    it('deve listar laboratórios cadastrados com capacidade e status', async () => {
      const labs = await labRepo.findAll();
      expect(labs.length).toBeGreaterThanOrEqual(4);
      const netLab = labs.find((l) => l.code === 'LAB-RED-101');
      expect(netLab).toBeDefined();
      expect(netLab?.capacity).toBe(32);
    });

    it('deve listar inventário e permitir criar novos equipamentos', async () => {
      const items = await equipmentRepo.findAll();
      const initialCount = items.length;

      const newItem = await equipmentRepo.create({
        name: 'Multímetro Digital True RMS',
        tag: 'PAT-9999',
        category: 'prototipagem',
        brand: 'Fluke',
        model: '179',
        serialNumber: 'FLK-179-99',
        status: 'available',
        location: 'Bancada 04',
        specifications: { Precisão: '0.09%' },
        accessories: ['Pontas de prova TL75', 'Bateria 9V'],
      });

      expect(newItem.id).toBeDefined();
      expect(newItem.tag).toBe('PAT-9999');

      const updatedList = await equipmentRepo.findAll();
      expect(updatedList.length).toBe(initialCount + 1);
    });
  });

  describe('Increment 04 & 05 — Reservas Simples, Recorrentes e Conflitos', () => {
    it('deve impedir criação de reserva com sobreposição de horário (conflito)', async () => {
      const today = new Date().toISOString().split('T')[0];

      // res-01 already exists in seed today from 14:00 to 17:30 on lab-01
      await expect(
        reservationRepo.create({
          title: 'Reserva Conflitante',
          type: 'lab',
          resourceId: 'lab-01',
          resourceName: 'Laboratório de Redes e Infraestrutura',
          resourceCodeOrTag: 'LAB-RED-101',
          userId: 'usr-stud-01',
          userName: 'Lucas Mendes Prado',
          userRole: 'student',
          date: today,
          startTime: '15:00',
          endTime: '16:00',
          purpose: 'Tentativa de aula sobreposta',
          status: 'confirmed',
          isRecurring: false,
        })
      ).rejects.toThrow(/Conflito detectado/);
    });

    it('deve criar reservas recorrentes ignorando ou listando datas em conflito', async () => {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = await reservationRepo.createRecurring(
        {
          title: 'Série de Aulas Robótica',
          type: 'lab',
          resourceId: 'lab-03',
          resourceName: 'Laboratório de IA & HPC',
          resourceCodeOrTag: 'LAB-HPC-201',
          userId: 'usr-teach-01',
          userName: 'Prof. Roberto Alencar',
          userRole: 'teacher',
          date: today,
          startTime: '08:00',
          endTime: '10:00',
          purpose: 'Aulas semanais',
          status: 'confirmed',
        },
        {
          frequency: 'weekly',
          daysOfWeek: [new Date().getDay()],
          startDate: today,
          endDate: futureDate,
          totalOccurrences: 0,
        }
      );

      expect(result.created.length).toBeGreaterThan(0);
      expect(result.created[0].isRecurring).toBe(true);
      expect(result.created[0].seriesId).toBeDefined();
    });
  });

  describe('Increment 06 — Fila de Espera e Promoção Automática', () => {
    it('deve atribuir maior prioridade a docentes (100) em relação a alunos (50)', async () => {
      const today = new Date().toISOString().split('T')[0];

      const studentEntry = await waitlistRepo.join({
        resourceType: 'lab',
        resourceId: 'lab-01',
        resourceName: 'Laboratório de Redes',
        userId: 'usr-stud-01',
        userName: 'Lucas Mendes Prado',
        userRole: 'student',
        date: today,
        startTime: '14:00',
        endTime: '17:30',
        purpose: 'TCC',
      });

      const teacherEntry = await waitlistRepo.join({
        resourceType: 'lab',
        resourceId: 'lab-01',
        resourceName: 'Laboratório de Redes',
        userId: 'usr-teach-01',
        userName: 'Prof. Roberto Alencar',
        userRole: 'teacher',
        date: today,
        startTime: '14:00',
        endTime: '17:30',
        purpose: 'Aula extraordinária',
      });

      expect(teacherEntry.priorityScore).toBe(100);
      expect(studentEntry.priorityScore).toBe(50);
    });

    it('deve promover automaticamente o candidato da fila quando uma reserva concorrente for cancelada', async () => {
      // Cancel res-01 (14:00 to 17:30 today on lab-01)
      const cancelled = await reservationRepo.cancel(
        'res-01',
        'Imprevisto acadêmico'
      );
      expect(cancelled.status).toBe('cancelled');

      // Check that wait-01 (Lucas Prado) was auto-promoted into a confirmed reservation!
      const reservations = await reservationRepo.findAll();
      const promoted = reservations.find((r) => r.userId === 'usr-stud-01' && r.resourceId === 'lab-01' && r.status === 'confirmed');
      expect(promoted).toBeDefined();
    });
  });

  describe('Increment 07 & 08 — Custódia e Manutenção', () => {
    it('deve realizar check-out e marcar equipamento como in_use', async () => {
      const newRecord = await custodyRepo.checkout({
        equipmentId: 'eq-01',
        equipmentName: 'Osciloscópio Digital',
        equipmentTag: 'PAT-0042',
        userId: 'usr-stud-01',
        userName: 'Lucas Mendes',
        userRole: 'student',
        userEmail: 'lucas@instituto.edu.br',
        technicianId: 'usr-tech-01',
        technicianName: 'Ana Silva',
        checkoutDate: new Date().toISOString(),
        expectedReturnDate: new Date(Date.now() + 86400000).toISOString(),
        accessoriesChecked: ['Cabo de força'],
        initialConditionNotes: 'Perfeito',
        signatureSimulated: true,
        hasDamage: false,
      });

      expect(newRecord.id).toBeDefined();
      expect(newRecord.status).toBe('active');

      const eq = await equipmentRepo.findById('eq-01');
      expect(eq?.status).toBe('in_use');
      expect(eq?.currentUserName).toBe('Lucas Mendes');
    });

    it('deve abrir ordem de serviço e marcar equipamento como damaged ao registrar avaria na devolução', async () => {
      const checkedIn = await custodyRepo.checkin(
        'cust-01',
        'Devolvido com cabo partido',
        true,
        'Ponta de teste danificada e conector solto'
      );

      expect(checkedIn.status).toBe('damaged');
      expect(checkedIn.hasDamage).toBe(true);

      // Verify equipment is now locked in maintenance
      const eq = await equipmentRepo.findById('eq-02');
      expect(eq?.status).toBe('maintenance');

      // Verify emergency maintenance order was automatically created
      const orders = await maintenanceRepo.findAll();
      const autoOrder = orders.find((o) => o.equipmentId === 'eq-02');
      expect(autoOrder).toBeDefined();
      expect(autoOrder?.status).toBe('open');

      // Resolve maintenance order and verify equipment becomes available again
      if (autoOrder) {
        await maintenanceRepo.updateStatus(autoOrder.id, 'resolved', 'Cabo trocado e calibrado');
        const eqResolved = await equipmentRepo.findById('eq-02');
        expect(eqResolved?.status).toBe('available');
      }
    });
  });

  describe('Increment 11 — Injeção de Falhas e Cenários', () => {
    it('deve lançar erro HTTP 500 simulado quando simulação de erro estiver ativa', async () => {
      latencyConfig.setErrorSimulation(true);

      await expect(labRepo.findAll()).rejects.toThrow(
        /Falha simulada no backend \(HTTP 500/
      );

      latencyConfig.setErrorSimulation(false);
      const labs = await labRepo.findAll();
      expect(labs.length).toBeGreaterThan(0);
    });

    it('deve permitir carregar cenário limpo (empty)', async () => {
      mockStore.loadScenario('empty');
      const resList = await reservationRepo.findAll();
      expect(resList.length).toBe(0);
      const queue = await waitlistRepo.findAll();
      expect(queue.length).toBe(0);
    });
  });
});
