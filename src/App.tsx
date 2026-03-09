import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/app-store';
import SelectUser from '@/routes/auth/SelectUser';
import Layout from '@/components/shared/Layout';
import PosPage from '@/routes/pos/PosPage';
import TablesPage from '@/routes/tables/TablesPage';
import KitchenPage from '@/routes/kitchen/KitchenPage';
import InventoryPage from '@/routes/inventory/InventoryPage';
import EmployeesPage from '@/routes/employees/EmployeesPage';
import ReportsPage from '@/routes/reports/ReportsPage';
import OrderHistoryPage from '@/routes/pos/OrderHistoryPage';
import MenuPage from '@/routes/menu/MenuPage';
import CrmPage from '@/routes/crm/CrmPage';
import SettingsPage from '@/routes/settings/SettingsPage';

function AppRoutes() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <SelectUser />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/pos" element={<PosPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/history" element={<OrderHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
