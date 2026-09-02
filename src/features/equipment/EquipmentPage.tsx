import React, { useState, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import { equipmentRepo, labRepo } from '../../infrastructure/mocks/repositories';
import type { Equipment, EquipmentCategory } from '../../domain/equipment/types';
import type { Laboratory } from '../../domain/laboratories/types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Cpu,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react';

export const EquipmentPage: React.FC = () => {
  const { hasPermission, showToast, setActiveTab, refreshTrigger } = useApp();
  const [items, setItems] = useState<Equipment[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Equipment Form State
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState<EquipmentCategory>('prototipagem');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newLocation, setNewLocation] = useState('Armário A1');
  const [newLabId, setNewLabId] = useState('');
  const [newAccessories, setNewAccessories] = useState('Cabo de força, Manual, Estojo');
  const [newRequiresTraining, setNewRequiresTraining] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemList, labList] = await Promise.all([
        equipmentRepo.findAll(),
        labRepo.findAll(),
      ]);
      setItems(itemList);
      setLabs(labList);
      if (labList.length > 0 && !newLabId) {
        setNewLabId(labList[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar inventário';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTag) {
      showToast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    try {
      const selectedLab = labs.find((l) => l.id === newLabId);

      await equipmentRepo.create({
        name: newName,
        tag: newTag,
        category: newCategory,
        brand: newBrand || 'Genérica',
        model: newModel || 'Padrão',
        serialNumber: newSerial || `SN-${Date.now()}`,
        status: 'available',
        location: newLocation,
        labId: newLabId,
        labName: selectedLab?.name,
        specifications: {
          Categoria: newCategory.toUpperCase(),
          Origem: 'Aquisição Institucional',
        },
        accessories: newAccessories.split(',').map((a) => a.trim()),
        requiresSpecialTraining: newRequiresTraining,
      });

      showToast(`Equipamento ${newTag} cadastrado com sucesso!`, 'success');
      setIsAddModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar equipamento';
      showToast(msg, 'error');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const availableCount = items.filter((i) => i.status === 'available').length;
  const inUseCount = items.filter((i) => i.status === 'in_use' || i.status === 'reserved').length;
  const maintenanceCount = items.filter((i) => i.status === 'maintenance' || i.status === 'damaged').length;

  const categoryLabels: Record<string, string> = {
    osciloscopio: 'Osciloscópios',
    prototipagem: 'Prototipagem & IoT',
    vr_ar: 'VR / AR & Games',
    computacao: 'Computação & Servidores',
    impressao_3d: 'Impressão 3D',
    audiovisual: 'Audiovisual & Termografia',
    redes: 'Redes & Análise Lógica',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu color="var(--primary)" /> Inventário de Equipamentos
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Controle de patrimônio, especificações técnicas, kits de acessórios e estado operacional.
          </p>
        </div>

        {hasPermission('manage_equipment') && (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Cadastrar Equipamento
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid-4">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total de Itens
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>{items.length}</h3>
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
            <Sparkles size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Em Uso / Reservados
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)' }}>{inUseCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Manutenção / Avaria
            </span>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--danger)' }}>{maintenanceCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, patrimônio (tag), marca ou localização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Categoria:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="all">Todas as Categorias</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
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
            <option value="available">Disponíveis</option>
            <option value="in_use">Em Uso</option>
            <option value="reserved">Reservados</option>
            <option value="maintenance">Em Manutenção</option>
          </select>
        </div>
      </div>

      {/* Equipment List Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Carregando inventário...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Nenhum equipamento encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="grid-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      background: 'rgba(0, 240, 255, 0.1)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {item.tag}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', marginTop: '6px' }}>{item.name}</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.brand} • {item.model}
                  </span>
                </div>
                <Badge status={item.status} />
              </div>

              {/* Training Warning */}
              {item.requiresSpecialTraining && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color: 'var(--warning)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <ShieldAlert size={14} /> Requer treinamento de segurança ESD
                </div>
              )}

              {/* Specs and Location */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Localização:</strong> {item.location} {item.labName ? `(${item.labName})` : ''}</div>
                {item.currentUserName && (
                  <div style={{ color: 'var(--primary)' }}>
                    <strong>Em custódia com:</strong> {item.currentUserName}
                  </div>
                )}
                {item.notes && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>
                    <strong>Observação:</strong> {item.notes}
                  </div>
                )}
              </div>

              {/* Accessories Count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <ClipboardList size={14} color="var(--primary)" />
                <span>{item.accessories.length} acessórios no checklist de conferência</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                <button
                  onClick={() => setSelectedItem(item)}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                >
                  Ficha Técnica
                </button>

                {item.status === 'available' ? (
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    Agendar
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('waitlist')}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    Fila de Espera
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Item Technical Details */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `${selectedItem.name} (${selectedItem.tag})` : 'Detalhes do Equipamento'}
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedItem.brand} — {selectedItem.model} (Serial: {selectedItem.serialNumber})
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Local de guarda: {selectedItem.location}
                </p>
              </div>
              <Badge status={selectedItem.status} />
            </div>

            {/* Specifications Table */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--primary)' }}>
                Especificações Técnicas
              </h4>
              <div className="table-container">
                <table className="custom-table">
                  <tbody>
                    {Object.entries(selectedItem.specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td style={{ fontWeight: 600, width: '40%', color: 'var(--text-secondary)' }}>{key}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accessories Checklist */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--primary)' }}>
                Itens de Acessórios Obrigatórios
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedItem.accessories.map((acc, i) => (
                  <li
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.84rem',
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span>{acc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setActiveTab('custody');
                }}
                className="btn btn-secondary"
              >
                Ir para Balcão de Custódia
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setActiveTab('reservations');
                }}
                className="btn btn-primary"
              >
                Reservar Item
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add Equipment */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Novo Equipamento no Inventário"
      >
        <form onSubmit={handleCreateItem}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nome do Equipamento *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Gerador de Funções Arbitrárias"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tombamento / Patrimônio (Tag) *</label>
              <input
                type="text"
                required
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Ex: PAT-0889"
                className="form-input"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as EquipmentCategory)}
                className="form-select"
              >
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Laboratório Vinculado</label>
              <select
                value={newLabId}
                onChange={(e) => setNewLabId(e.target.value)}
                className="form-select"
              >
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Marca</label>
              <input
                type="text"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="Ex: Rigol"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <input
                type="text"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="Ex: DG1022Z"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Número de Série</label>
              <input
                type="text"
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                placeholder="Ex: DG1ZA221004"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Localização no Laboratório / Armário</label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Ex: Armário B2 — Prateleira 3"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Checklist de Acessórios (separados por vírgula)</label>
            <input
              type="text"
              value={newAccessories}
              onChange={(e) => setNewAccessories(e.target.value)}
              placeholder="Ex: Cabo BNC, Cabo de força, Ponteira jacaré"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newRequiresTraining}
                onChange={(e) => setNewRequiresTraining(e.target.checked)}
                style={{ accentColor: 'var(--primary)' }}
              />
              <span className="form-label" style={{ margin: 0 }}>
                Exige treinamento de segurança / ESD antes da retirada
              </span>
            </label>
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Cadastrar Equipamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
