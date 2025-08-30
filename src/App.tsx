import { Routes, Route } from "react-router-dom";
import Layout from "@/components/layout";
import OverviewDashboardPage from "@/pages/overview-dashboard";
import PurchaseDashboardPage from "@/pages/purchase-dashboard";
import SalesDashboardPage from "@/pages/sales-dashboard";
import InventoryPage from "@/pages/inventory";
import CategoriesPage from "@/pages/categories";
import ItemsPage from "@/pages/items";
import PurchasesPage from "@/pages/purchases";
import NewPurchasePage from "@/pages/new-purchase";
import EditPurchasePage from "@/pages/edit-purchase";
import LoginPage from "@/pages/login"; // Corrected import for default export
import SettingsPage from "@/pages/settings";
import { ProtectedRoute } from "@/components/protected-route";
import SalesPage from "@/pages/sales";
import NewSalePage from "@/pages/new-sale";
import EditSalePage from "@/pages/edit-sale";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import BarcodePrintPage from "@/pages/barcode-print";
import StockAdjustmentPage from "@/pages/stock-adjustment";
import ExpensesPage from "@/pages/expenses";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<OverviewDashboardPage />} />
          <Route path="dashboards/purchase" element={<PurchaseDashboardPage />} />
          <Route path="dashboards/sales" element={<SalesDashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="purchases" element={<PurchasesPage />} />
          <Route path="purchases/new" element={<NewPurchasePage />} />
          <Route path="purchases/edit/:purchaseId" element={<EditPurchasePage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/new" element={<NewSalePage />} />
          <Route path="sales/edit/:saleId" element={<EditSalePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="barcode-print" element={<BarcodePrintPage />} />
          <Route path="stock-adjustment" element={<StockAdjustmentPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App;