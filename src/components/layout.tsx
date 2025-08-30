import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-provider.tsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Menu, PlusCircle, LayoutDashboard, BarChart, Package, ShoppingCart, ShoppingBag, Tag, Users, ChevronsLeft, UserRound, Truck, ScanBarcode, TrendingUp, ReceiptText,
  ChevronDown, DollarSign, FileText, Scale, Landmark, ScrollText, ClipboardList, LineChart, ListChecks, FileStack, Wallet, Banknote, Clock,
  AlertCircle, Calendar, Settings, ArrowLeftRight 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { ChatbotTrigger } from "@/components/chatbot-trigger";
import { ChatbotDialog } from "@/components/chatbot-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Define a type for navigation items, including nested children
interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  children?: NavItem[];
}

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      isActive && "bg-muted text-primary",
      isCollapsed && "flex-col h-auto justify-center gap-1 py-3"
    );
  
  const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      isActive && "bg-muted text-primary"
    );

  const closeSheet = () => setIsSheetOpen(false);

  const navItems: NavItem[] = [
    { to: "/", icon: LayoutDashboard, label: "Overview Dashboard", end: true },
    {
      to: "/sales-module/dashboard",
      icon: ShoppingBag,
      label: "Sales Module",
      children: [
        { to: "/sales-module/sales-invoice", icon: FileText, label: "Sales Invoice" },
        { to: "/sales-module/sales-return", icon: ArrowLeftRight, label: "Sales Return" },
        { to: "/sales-module/customer-receivables", icon: DollarSign, label: "Customer Receivables" },
        { to: "/sales-module/customers", icon: UserRound, label: "Customer Master" },
      ],
    },
    {
      to: "/purchase-module/dashboard",
      icon: ShoppingCart,
      label: "Purchase Module",
      children: [
        { to: "/purchase-module/purchase-invoice", icon: FileText, label: "Purchase Invoice" },
        { to: "/purchase-module/purchase-return", icon: ArrowLeftRight, label: "Purchase Return" },
        { to: "/purchase-module/supplier-payables", icon: Banknote, label: "Supplier Payables" },
        { to: "/purchase-module/suppliers", icon: Truck, label: "Supplier Master" },
      ],
    },
    {
      to: "/inventory-module/dashboard",
      icon: Package,
      label: "Inventory Module",
      children: [
        { to: "/inventory-module/item-master", icon: Tag, label: "Item Master" },
        { to: "/inventory-module/categories", icon: Users, label: "Category Master" },
        { to: "/inventory-module/stock-adjustment", icon: TrendingUp, label: "Stock Adjustment" },
        { to: "/inventory-module/stock-ledger", icon: ScrollText, label: "Stock Ledger" },
        { to: "/inventory-module/category-wise-stock", icon: ListChecks, label: "Category-wise Stock" },
        { to: "/inventory-module/reorder-level-alerts", icon: AlertCircle, label: "Reorder Level Alerts" },
        { to: "/inventory-module/barcode-print", icon: ScanBarcode, label: "Print Barcodes" },
      ],
    },
    {
      to: "/accounts-module/dashboard",
      icon: Landmark,
      label: "Accounts Module",
      children: [
        { to: "/accounts-module/payables-receivables", icon: Wallet, label: "Payables & Receivables" },
        { to: "/accounts-module/journal-entries", icon: ClipboardList, label: "Journal Entries" },
        { to: "/accounts-module/trial-balance", icon: Scale, label: "Trial Balance" },
        { to: "/accounts-module/profit-loss-statement", icon: LineChart, label: "Profit & Loss" },
        { to: "/accounts-module/balance-sheet", icon: FileStack, label: "Balance Sheet" },
        { to: "/accounts-module/expenses", icon: ReceiptText, label: "Expenses" },
      ],
    },
    {
      to: "/reports-module/dashboard",
      icon: BarChart,
      label: "Reports Module",
      children: [
        {
          to: "/reports-module/sales/date-wise",
          icon: Calendar,
          label: "Sales Reports",
          children: [
            { to: "/reports-module/sales/date-wise", icon: Calendar, label: "Date-wise Sales" },
            { to: "/reports-module/sales/monthly", icon: Clock, label: "Monthly Sales Summary" },
            { to: "/reports-module/sales/item-wise", icon: Tag, label: "Item-wise Sales" },
            { to: "/reports-module/sales/category-wise", icon: Users, label: "Category-wise Sales" },
            { to: "/reports-module/sales/customer-outstanding", icon: UserRound, label: "Customer Outstanding" },
          ],
        },
        {
          to: "/reports-module/purchase/date-wise",
          icon: Calendar,
          label: "Purchase Reports",
          children: [
            { to: "/reports-module/purchase/date-wise", icon: Calendar, label: "Date-wise Purchase" },
            { to: "/reports-module/purchase/monthly", icon: Clock, label: "Monthly Purchase Summary" },
            { to: "/reports-module/purchase/item-wise", icon: Tag, label: "Item-wise Purchases" },
            { to: "/reports-module/purchase/category-wise", icon: Users, label: "Category-wise Purchases" },
            { to: "/reports-module/purchase/supplier-payables", icon: Truck, label: "Supplier Payables" },
          ],
        },
        {
          to: "/reports-module/inventory/stock-ledger",
          icon: Package,
          label: "Inventory Reports",
          children: [
            { to: "/reports-module/inventory/stock-ledger", icon: ScrollText, label: "Stock Ledger" },
            { to: "/reports-module/inventory/item-stock-valuation", icon: DollarSign, label: "Item Stock Valuation" },
            { to: "/reports-module/inventory/category-wise-stock", icon: ListChecks, label: "Category-wise Stock" },
            { to: "/reports-module/inventory/fast-slow-moving", icon: TrendingUp, label: "Fast/Slow Moving Items" },
          ],
        },
        {
          to: "/reports-module/financial/profit-loss",
          icon: Landmark,
          label: "Financial Reports",
          children: [
            { to: "/reports-module/financial/profit-loss", icon: LineChart, label: "Profit & Loss" },
            { to: "/reports-module/financial/balance-sheet", icon: FileStack, label: "Balance Sheet" },
            { to: "/reports-module/financial/cash-flow", icon: Banknote, label: "Cash Flow Statement" },
            { to: "/reports-module/financial/receivables-aging", icon: Clock, label: "Receivables Aging" },
            { to: "/reports-module/financial/payables-aging", icon: Clock, label: "Payables Aging" },
          ],
        },
      ],
    },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  // Helper to render nav links, recursively for nested items
  const renderNavLinks = (items: NavItem[], isMobile: boolean) => { // Removed unused 'parentPath'
    return items.map((item) => {
      const currentPath = item.to;
      const isActive = location.pathname.startsWith(currentPath) && (item.end ? location.pathname === currentPath : true);

      if (item.children && item.children.length > 0) {
        if (isMobile) {
          return (
            <div key={item.label} className="space-y-1">
              <NavLink to={item.to} className={mobileNavLinkClasses} onClick={closeSheet} end={item.end}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
              <div className="ml-4 border-l pl-2 space-y-1">
                {renderNavLinks(item.children, isMobile)}
              </div>
            </div>
          );
        } else {
          return (
            <Collapsible key={item.label} defaultOpen={isActive} className="w-full">
              <CollapsibleTrigger asChild>
                <NavLink to={item.to} className={cn(
                  "flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                  isActive ? "bg-muted text-primary" : "text-muted-foreground",
                  isCollapsed ? "flex-col h-auto justify-center gap-1 py-3" : "pr-2"
                )} end={item.end}>
                  <div className={cn("flex items-center gap-3", isCollapsed && "flex-col gap-1")}>
                    <item.icon className="h-5 w-5" />
                    <span className={cn(
                      !isCollapsed && "truncate",
                      isCollapsed && "text-xs text-center break-words max-w-full"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  {!isCollapsed && <ChevronDown className="h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />}
                </NavLink>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <nav className={cn("grid items-start text-sm font-medium", isCollapsed ? "px-0" : "pl-6 pr-2")}>
                  {renderNavLinks(item.children, isMobile)}
                </nav>
              </CollapsibleContent>
            </Collapsible>
          );
        }
      } else {
        return (
          <NavLink key={item.label} to={item.to} className={isMobile ? mobileNavLinkClasses : navLinkClasses} onClick={isMobile ? closeSheet : undefined} end={item.end}>
            <item.icon className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
            <span className={cn(
              !isCollapsed && "truncate",
              isCollapsed && "text-xs text-center break-words max-w-full"
            )}>
              {item.label}
            </span>
          </NavLink>
        );
      }
    });
  };

  return (
    <div className={cn("grid min-h-screen w-full md:grid-cols-[auto_1fr]")}>
      <div className={cn(
        "hidden border-r bg-muted/40 md:block transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[88px]" : "w-[220px] lg:w-[280px]"
      )}>
        <div className={cn(
          "flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6",
          isCollapsed && "justify-center"
        )}>
          <NavLink to="/" className={cn("flex items-center gap-2 font-semibold", isCollapsed && "hidden")}>
            <Package className="h-6 w-6 text-primary" />
            <span>PurchaseTracker</span>
          </NavLink>
          <Button variant="ghost" size="icon" className={cn("h-8 w-8", !isCollapsed && "ml-auto")} onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronsLeft className="h-5 w-5 transition-transform" />
          </Button>
        </div>
        <div className="flex-1 py-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {renderNavLinks(navItems, false)}
          </nav>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Toggle navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>PurchaseTracker</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Package className="h-6 w-6 text-primary" />
                  <span>PurchaseTracker</span>
                </NavLink>
                {renderNavLinks(navItems, true)}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <div className="relative">
              {/* Existing Dashboards Dropdown - can be kept or removed based on preference */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <span className="flex items-center">
                      <BarChart className="mr-2 h-4 w-4" />
                      <span>Dashboards</span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => navigate('/')}>Overview</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/sales-module/dashboard')}>Sales Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/purchase-module/dashboard')}>Purchase Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/inventory-module/dashboard')}>Inventory Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/accounts-module/dashboard')}>Accounts Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/reports-module/dashboard')}>Reports Dashboard</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <span className="flex items-center">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>New</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate('/purchase-module/purchase-invoice/new')}>New Purchase</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/sales-module/sales-invoice/new')}>New Sale</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/inventory-module/item-master')}>New Item</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/inventory-module/categories')}>New Category</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/sales-module/customers')}>New Customer</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/purchase-module/suppliers')}>New Supplier</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/inventory-module/stock-adjustment')}>Stock Adjustment</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/accounts-module/expenses')}>New Expense</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/sales-module/sales-return/new')}>New Sales Return</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/purchase-module/purchase-return/new')}>New Purchase Return</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full" aria-label="Toggle user menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
          <Outlet key={location.pathname} />
        </main>
        <ChatbotTrigger onClick={() => setIsChatbotOpen(true)} />
        <ChatbotDialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
      </div>
    </div>
  );
}

export default Layout;