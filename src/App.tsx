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
import LoginPage from "@/pages/login"; // Corrected import to use default export
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

// New page imports for module-wise structure
import SalesReturnPage from "@/pages/sales-return";
import NewSalesReturnPage from "@/pages/new-sales-return";
// import EditSalesReturnPage from "@/pages/edit-sales-return"; // Will add this later if needed
import CustomerReceivablesPage from "@/pages/customer-receivables";
import PurchaseReturnPage from "@/pages/purchase-return";
import NewPurchaseReturnPage from "@/pages/new-purchase-return";
// import EditPurchaseReturnPage from "@/pages/edit-purchase-return"; // Will add this later if needed
import SupplierPayablesPage from "@/pages/supplier-payables";
import StockLedgerPage from "@/pages/stock-ledger";
import ReorderLevelAlertsPage from "@/pages/reorder-level-alerts";
import CategoryWiseStockPage from "@/pages/category-wise-stock";
import AccountsDashboardPage from "@/pages/accounts-dashboard";
import PayablesReceivablesPage from "@/pages/payables-receivables";
import JournalEntriesPage from "@/pages/journal-entries";
import TrialBalancePage from "@/pages/trial-balance";
import ProfitLossStatementPage from "@/pages/profit-loss-statement";
import BalanceSheetPage from "@/pages/balance-sheet";
import ReportsDashboardPage from "@/pages/reports-dashboard";
import DateWiseSalesPage from "@/pages/sales-reports-date-wise";
import MonthlySalesSummaryPage from "@/pages/sales-reports-monthly";
import ItemWiseSalesPage from "@/pages/sales-reports-item-wise";
import CategoryWiseSalesPage from "@/pages/sales-reports-category-wise";
import CustomerOutstandingReceivablesPage from "@/pages/sales-reports-customer-outstanding";
import DateWisePurchasePage from "@/pages/purchase-reports-date-wise";
import MonthlyPurchaseSummaryPage from "@/pages/purchase-reports-monthly";
import ItemWisePurchasesPage from "@/pages/purchase-reports-item-wise";
import CategoryWisePurchasesPage from "@/pages/purchase-reports-category-wise";
import SupplierWisePayablesPage from "@/pages/purchase-reports-supplier-payables";
import InventoryStockLedgerPage from "@/pages/inventory-reports-stock-ledger";
import ItemStockValuationPage from "@/pages/inventory-reports-item-stock-valuation";
import InventoryCategoryWiseStockPage from "@/pages/inventory-reports-category-wise-stock";
import FastSlowMovingItemsPage from "@/pages/inventory-reports-fast-slow-moving";
import FinancialProfitLossPage from "@/pages/financial-reports-profit-loss";
import FinancialBalanceSheetPage from "@/pages/financial-reports-balance-sheet";
import FinancialCashFlowPage from "@/pages/financial-reports-cash-flow";
import FinancialReceivablesAgingPage from "@/pages/financial-reports-receivables-aging";
import FinancialPayablesAgingPage from "@/pages/financial-reports-payables-aging";
import ReceiptVouchersPage from "@/pages/receipt-vouchers"; // New import
import NewReceiptVoucherPage from "@/pages/new-receipt-voucher"; // New import
import PaymentVouchersPage from "@/pages/payment-vouchers"; // New import
import NewPaymentVoucherPage from "@/pages/new-payment-voucher"; // New import


function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<OverviewDashboardPage />} />
          
          {/* Sales Module */}
          <Route path="sales-module/dashboard" element={<SalesDashboardPage />} />
          <Route path="sales-module/sales-invoice" element={<SalesPage />} /> {/* Existing Sales page */}
          <Route path="sales-module/sales-invoice/new" element={<NewSalePage />} />
          <Route path="sales-module/sales-invoice/edit/:saleId" element={<EditSalePage />} />
          <Route path="sales-module/sales-return" element={<SalesReturnPage />} />
          <Route path="sales-module/sales-return/new" element={<NewSalesReturnPage />} />
          {/* <Route path="sales-module/sales-return/edit/:salesReturnId" element={<EditSalesReturnPage />} /> */}
          <Route path="sales-module/customer-receivables" element={<CustomerReceivablesPage />} />
          <Route path="sales-module/customers" element={<CustomersPage />} /> {/* Existing Customers page */}

          {/* Purchase Module */}
          <Route path="purchase-module/dashboard" element={<PurchaseDashboardPage />} />
          <Route path="purchase-module/purchase-invoice" element={<PurchasesPage />} /> {/* Existing Purchases page */}
          <Route path="purchase-module/purchase-invoice/new" element={<NewPurchasePage />} />
          <Route path="purchase-module/purchase-invoice/edit/:purchaseId" element={<EditPurchasePage />} />
          <Route path="purchase-module/purchase-return" element={<PurchaseReturnPage />} />
          <Route path="purchase-module/purchase-return/new" element={<NewPurchaseReturnPage />} />
          {/* <Route path="purchase-module/purchase-return/edit/:purchaseReturnId" element={<EditPurchaseReturnPage />} /> */}
          <Route path="purchase-module/supplier-payables" element={<SupplierPayablesPage />} />
          <Route path="purchase-module/suppliers" element={<SuppliersPage />} /> {/* Existing Suppliers page */}

          {/* Inventory Module */}
          <Route path="inventory-module/dashboard" element={<InventoryPage />} /> {/* Existing Inventory page */}
          <Route path="inventory-module/item-master" element={<ItemsPage />} /> {/* Existing Items page */}
          <Route path="inventory-module/categories" element={<CategoriesPage />} /> {/* Existing Categories page */}
          <Route path="inventory-module/stock-adjustment" element={<StockAdjustmentPage />} /> {/* Existing Stock Adjustment page */}
          <Route path="inventory-module/stock-ledger" element={<StockLedgerPage />} />
          <Route path="inventory-module/category-wise-stock" element={<CategoryWiseStockPage />} />
          <Route path="inventory-module/reorder-level-alerts" element={<ReorderLevelAlertsPage />} />
          <Route path="inventory-module/barcode-print" element={<BarcodePrintPage />} /> {/* Existing Barcode Print page */}

          {/* Accounts Module */}
          <Route path="accounts-module/dashboard" element={<AccountsDashboardPage />} />
          <Route path="accounts-module/payables-receivables" element={<PayablesReceivablesPage />} />
          <Route path="accounts-module/receipt-vouchers" element={<ReceiptVouchersPage />} /> {/* New route */}
          <Route path="accounts-module/receipt-vouchers/new" element={<NewReceiptVoucherPage />} /> {/* New route */}
          <Route path="accounts-module/payment-vouchers" element={<PaymentVouchersPage />} /> {/* New route */}
          <Route path="accounts-module/payment-vouchers/new" element={<NewPaymentVoucherPage />} /> {/* New route */}
          <Route path="accounts-module/journal-entries" element={<JournalEntriesPage />} />
          <Route path="accounts-module/trial-balance" element={<TrialBalancePage />} />
          <Route path="accounts-module/profit-loss-statement" element={<ProfitLossStatementPage />} />
          <Route path="accounts-module/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="accounts-module/expenses" element={<ExpensesPage />} /> {/* Existing Expenses page */}

          {/* Reports Module */}
          <Route path="reports-module/dashboard" element={<ReportsDashboardPage />} />
          <Route path="reports-module/sales/date-wise" element={<DateWiseSalesPage />} />
          <Route path="reports-module/sales/monthly" element={<MonthlySalesSummaryPage />} />
          <Route path="reports-module/sales/item-wise" element={<ItemWiseSalesPage />} />
          <Route path="reports-module/sales/category-wise" element={<CategoryWiseSalesPage />} />
          <Route path="reports-module/sales/customer-outstanding" element={<CustomerOutstandingReceivablesPage />} />
          <Route path="reports-module/purchase/date-wise" element={<DateWisePurchasePage />} />
          <Route path="reports-module/purchase/monthly" element={<MonthlyPurchaseSummaryPage />} />
          <Route path="reports-module/purchase/item-wise" element={<ItemWisePurchasesPage />} />
          <Route path="reports-module/purchase/category-wise" element={<CategoryWisePurchasesPage />} />
          <Route path="reports-module/purchase/supplier-payables" element={<SupplierWisePayablesPage />} />
          <Route path="reports-module/inventory/stock-ledger" element={<InventoryStockLedgerPage />} />
          <Route path="reports-module/inventory/item-stock-valuation" element={<ItemStockValuationPage />} />
          <Route path="reports-module/inventory/category-wise-stock" element={<InventoryCategoryWiseStockPage />} />
          <Route path="reports-module/inventory/fast-slow-moving" element={<FastSlowMovingItemsPage />} />
          <Route path="reports-module/financial/profit-loss" element={<FinancialProfitLossPage />} />
          <Route path="reports-module/financial/balance-sheet" element={<FinancialBalanceSheetPage />} />
          <Route path="reports-module/financial/cash-flow" element={<FinancialCashFlowPage />} />
          <Route path="reports-module/financial/receivables-aging" element={<FinancialReceivablesAgingPage />} />
          <Route path="reports-module/financial/payables-aging" element={<FinancialPayablesAgingPage />} />

          {/* Existing top-level routes (will be removed from direct navigation in Layout, but kept for direct access if needed) */}
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