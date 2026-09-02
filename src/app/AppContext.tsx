import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role, Permission } from '../domain/auth/types';
import { mockStore, type ScenarioName } from '../infrastructure/storage/store';
import { latencyConfig } from '../infrastructure/latency/simulator';
import { authRepo } from '../infrastructure/mocks/repositories';

export type NavTab =
  | 'labs'
  | 'equipment'
  | 'reservations'
  | 'waitlist'
  | 'custody'
  | 'maintenance'
  | 'kiosk'
  | 'audit';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  currentUser: User;
  allUsers: User[];
  switchUserRole: (role: Role) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  scenario: ScenarioName;
  loadScenario: (scenario: ScenarioName) => void;
  latencyMs: number;
  setLatencyMs: (ms: number) => void;
  simulateError: boolean;
  setSimulateError: (enabled: boolean) => void;
  unreadNotificationsCount: number;
  isNotificationsDrawerOpen: boolean;
  setIsNotificationsDrawerOpen: (open: boolean) => void;
  showToast: (message: string, type?: ToastItem['type']) => void;
  toasts: ToastItem[];
  removeToast: (id: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(mockStore.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(mockStore.getData().users);
  const [activeTab, setActiveTab] = useState<NavTab>('labs');
  const [scenario, setScenarioState] = useState<ScenarioName>(mockStore.getData().currentScenario);
  const [latencyMs, setLatencyState] = useState<number>(latencyConfig.getLatency());
  const [simulateError, setSimulateErrorState] = useState<boolean>(latencyConfig.isErrorSimulationActive());
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Subscribe to store updates
  useEffect(() => {
    const updateStoreState = () => {
      const data = mockStore.getData();
      setCurrentUser({ ...data.currentUser });
      setAllUsers([...data.users]);
      setScenarioState(data.currentScenario);

      // update unread notifications count
      const userUnread = data.notifications.filter(
        (n) => !n.read && (!n.userId || n.userId === data.currentUser.id)
      ).length;
      setUnreadNotificationsCount(userUnread);

      triggerRefresh();
    };

    updateStoreState();
    const unsubscribe = mockStore.subscribe(updateStoreState);
    return () => unsubscribe();
  }, []);

  const switchUserRole = async (role: Role) => {
    try {
      const updated = await authRepo.switchUser(role);
      setCurrentUser(updated);
      showToast(`Perfil alternado para: ${updated.name} (${updated.role.toUpperCase()})`, 'info');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao alternar usuário';
      showToast(errorMsg, 'error');
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return currentUser.permissions.includes(permission);
  };

  const loadScenario = (name: ScenarioName) => {
    mockStore.loadScenario(name);
    setScenarioState(name);
    showToast(`Cenário "${name.toUpperCase()}" carregado com sucesso!`, 'success');
  };

  const setLatencyMs = (ms: number) => {
    latencyConfig.setLatency(ms);
    setLatencyState(ms);
  };

  const setSimulateError = (enabled: boolean) => {
    latencyConfig.setErrorSimulation(enabled);
    setSimulateErrorState(enabled);
    if (enabled) {
      showToast('Simulação de falha de rede 500 ativada!', 'warning');
    } else {
      showToast('Simulação de falha de rede desativada.', 'info');
    }
  };

  const showToast = (message: string, type: ToastItem['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        switchUserRole,
        hasPermission,
        activeTab,
        setActiveTab,
        scenario,
        loadScenario,
        latencyMs,
        setLatencyMs,
        simulateError,
        setSimulateError,
        unreadNotificationsCount,
        isNotificationsDrawerOpen,
        setIsNotificationsDrawerOpen,
        showToast,
        toasts,
        removeToast,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
