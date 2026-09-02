import React from 'react';
import { AppProvider, useApp } from './app/AppContext';
import { Header } from './components/layout/Header';
import { MockControlBar } from './components/layout/MockControlBar';
import { NotificationsDrawer } from './components/layout/NotificationsDrawer';
import { ToastContainer } from './components/common/ToastContainer';

import { LaboratoriesPage } from './features/laboratories/LaboratoriesPage';
import { EquipmentPage } from './features/equipment/EquipmentPage';
import { ReservationsPage } from './features/reservations/ReservationsPage';
import { WaitlistPage } from './features/waitlist/WaitlistPage';
import { CustodyPage } from './features/custody/CustodyPage';
import { MaintenancePage } from './features/maintenance/MaintenancePage';
import { PublicPanelPage } from './features/public-panel/PublicPanelPage';
import { AuditPage } from './features/audit-scenarios/AuditPage';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'labs':
        return <LaboratoriesPage />;
      case 'equipment':
        return <EquipmentPage />;
      case 'reservations':
        return <ReservationsPage />;
      case 'waitlist':
        return <WaitlistPage />;
      case 'custody':
        return <CustodyPage />;
      case 'maintenance':
        return <MaintenancePage />;
      case 'kiosk':
        return <PublicPanelPage />;
      case 'audit':
        return <AuditPage />;
      default:
        return <LaboratoriesPage />;
    }
  };

  return (
    <div className="app-container">
      {/* Mock Control Toolbar for testing & UX validation */}
      <MockControlBar />

      {/* Main Navigation Header */}
      <Header />

      {/* Dynamic Main Page Content */}
      <main className="main-content">
        {renderActivePage()}
      </main>

      {/* Slide-in Notifications Drawer */}
      <NotificationsDrawer />

      {/* Floating Interactive Toast Feedback */}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
