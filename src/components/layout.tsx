
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Menu, PlusCircle, BarChart, Package, Tag, Users, ChevronsLeft, UserRound, Truck, ScanBarcode, TrendingUp, ReceiptText, 
  ChevronDown, DollarSign, Scale, Landmark, ScrollText, ClipboardList, LineChart, ListChecks, FileStack, Wallet, Banknote, Calendar, 
  AlertCircle, Settings, Clock, Receipt, HandCoins 
} from "lucide-react"; 
import {
  DropdownMenu,
  DropdownMenuTrigger, // Added this import
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useRef, useMemo, useCallback } from "react";
import { ChatbotTrigger } from "@/components/chatbot-trigger";
import { ChatbotDialog } from "@/components/chatbot-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// NavItem type for navigation structure
type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  children?: NavItem[];
};

function Layout() {

  // Ref for new action button
  const newActionButtonRef = useRef<HTMLButtonElement>(null);

  // Chatbot dialog state
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  // Fallback user and logout handler (replace with real auth logic)
  const user: { email?: string } | undefined = undefined;
  const handleLogout = () => {};
  // Router navigation
  const navigate = useNavigate();
  // Mobile sidebar Sheet open/close state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeSheet = () => setIsSheetOpen(false);
  // Fallback navLinkClasses and mobileNavLinkClasses for styling
  const navLinkClasses = ({ isActive }: { isActive?: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary'}`;

  const mobileNavLinkClasses = ({ isActive }: { isActive?: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary'}`;
  // Track open/closed state for all submenus (for nested collapsibles)
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  // Toggle a submenu open/closed
  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  // Track which top-level module is open in expanded sidebar
  const [openModulePath, setOpenModulePath] = useState<string | null>(null);
  // Sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);

// Define a type for navigation items, including nested children

// ...existing code...

// Navigation rendering logic should be inside a function, not at the top level
// (removed duplicate renderNavLinks and renderCollapsedDropdown definitions)
const navItems = useMemo(() => [
  {
    to: "/sales-module",
    icon: BarChart,
    label: "Sales Module",
    children: [
      { to: "/sales-module/sales-invoice", icon: Receipt, label: "Sales Invoice" },
      { to: "/sales-module/sales-return", icon: ReceiptText, label: "Sales Return" },
      { to: "/sales-module/customers", icon: Users, label: "Customers" },
  { to: "/sales-module/customer-receivables", icon: Wallet, label: "Receivables" },
    ],
  },
  {
    to: "/purchase-module",
    icon: Package,
    label: "Purchase Module",
    children: [
      { to: "/purchase-module/purchase-invoice", icon: Receipt, label: "Purchase Invoice" },
      { to: "/purchase-module/purchase-return", icon: ReceiptText, label: "Purchase Return" },
      { to: "/purchase-module/suppliers", icon: Truck, label: "Suppliers" },
  { to: "/purchase-module/supplier-payables", icon: Banknote, label: "Payables" },
    ],
  },
  {
    to: "/inventory-module", // Changed to parent path for module
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
      to: "/accounts-module", // Changed to parent path for module
      icon: Landmark,
      label: "Accounts Module",
      children: [
        { to: "/accounts-module/payables-receivables", icon: Wallet, label: "Payables & Receivables" },
        { to: "/accounts-module/receipt-vouchers", icon: Receipt, label: "Receipt Vouchers" },
        { to: "/accounts-module/payment-vouchers", icon: HandCoins, label: "Payment Vouchers" },
        { to: "/accounts-module/journal-entries", icon: ClipboardList, label: "Journal Entries" },
        { to: "/accounts-module/trial-balance", icon: Scale, label: "Trial Balance" },
        { to: "/accounts-module/profit-loss-statement", icon: LineChart, label: "Profit & Loss" },
        { to: "/accounts-module/balance-sheet", icon: FileStack, label: "Balance Sheet" },
        { to: "/accounts-module/expenses", icon: ReceiptText, label: "Expenses" },
      ],
    },
    {
      to: "/reports-module", // Changed to parent path for module
      icon: BarChart,
      label: "Reports Module",
      children: [
        {
          to: "/reports-module/sales", // Parent path for sales reports
          icon: Calendar,
          label: "Sales Reports",
          children: [
            { to: "/reports-module/sales/date-wise", icon: Calendar, label: "Date-wise Sales" },
            { to: "/reports-module/sales/monthly", icon: Clock, label: "Monthly Sales Summary" },
            { to: "/reports-module/sales/item-wise", icon: Tag, label: "Item-wise Sales" },
            { to: "/reports-module/sales/category-wise", icon: Users, label: "Category-wise Sales" },
            { to: "/reports-module/sales/customer-outstanding", icon: UserRound, label: "Customer Outstanding" },
            { to: "/reports-module/sales/detail", icon: ScrollText, label: "Sales Detail" }, // New Sales Detail Report
          ],
        },
        {
          to: "/reports-module/purchase", // Parent path for purchase reports
          icon: Calendar,
          label: "Purchase Reports",
          children: [
            { to: "/reports-module/purchase/date-wise", icon: Calendar, label: "Date-wise Purchase" },
            { to: "/reports-module/purchase/monthly", icon: Clock, label: "Monthly Purchase Summary" },
            { to: "/reports-module/purchase/item-wise", icon: Tag, label: "Item-wise Purchases" },
            { to: "/reports-module/purchase/category-wise", icon: Users, label: "Category-wise Purchases" },
            { to: "/reports-module/purchase/supplier-payables", icon: Truck, label: "Supplier Payables" },
            { to: "/reports-module/purchase/detail", icon: ScrollText, label: "Purchase Detail" }, // New Purchase Detail Report
          ],
        },
        {
          to: "/reports-module/inventory", // Parent path for inventory reports
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
          to: "/reports-module/financial", // Parent path for financial reports
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
], []);

  const getCurrentPageTitle = useCallback((pathname: string, items: NavItem[]): string => {
    for (const item of items) {
      const match = item.end ? pathname === item.to : pathname.startsWith(item.to);
      if (match) {
        if (item.children) {
          const childTitle = getCurrentPageTitle(pathname, item.children);
          return childTitle || item.label;
        }
        return item.label;
      }
    }
    return "Dashboard";
  }, []);

  const currentPageTitle = useMemo(() => getCurrentPageTitle(location.pathname, navItems), [location.pathname, navItems, getCurrentPageTitle]);

  const renderNavLinks = (items: NavItem[], isMobile: boolean, level: number = 0) => {
  // Helper for collapsed dropdown rendering
  const renderCollapsedDropdown = (subItems: NavItem[], subLevel: number = 0) => {
    return subItems.map(subItem => {
      if (subItem.children && subItem.children.length > 0) {
        return (
          <DropdownMenuSub key={subItem.label}>
            <DropdownMenuSubTrigger>
              <subItem.icon className="mr-2 h-4 w-4" />
              <span>{subItem.label}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {renderCollapsedDropdown(subItem.children, subLevel + 1)}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        );
      } else {
        return (
          <DropdownMenuItem key={subItem.label} asChild>
            <NavLink to={subItem.to} className="w-full">
              <subItem.icon className="mr-2 h-4 w-4" />
              {subItem.label}
            </NavLink>
          </DropdownMenuItem>
        );
      }
    });
  };

  return items.map((item) => {
    const currentPath = item.to;
    const isActive = location.pathname.startsWith(currentPath) && (item.end ? location.pathname === currentPath : true);
    const isParentActive = location.pathname.startsWith(item.to);
    const menuKey = currentPath;

      // Collapsed sidebar (desktop)
      if (isCollapsed && !isMobile) {
        if (item.children && item.children.length > 0) {
          return (
            <DropdownMenu key={item.label}>
              <DropdownMenuTrigger asChild>
                <div
                  className={cn(navLinkClasses({ isActive: isParentActive }), "flex-col h-auto py-2")}
                  role="button"
                  aria-label={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs text-center break-words max-w-full mt-1">
                    {item.label}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="ml-2">
                <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {renderCollapsedDropdown(item.children)}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        } else {
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  className={navLinkClasses({ isActive })}
                  end={item.end}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs text-center break-words max-w-full mt-1">
                    {item.label}
                  </span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }
      }

      // Expanded sidebar (desktop) - only one top-level open at a time
      if (!isCollapsed && !isMobile && level === 0 && item.children && item.children.length > 0) {
        const isOpen = openModulePath === item.to;
        return (
          <Collapsible
            key={item.label}
            open={isOpen}
            onOpenChange={(open) => setOpenModulePath(open ? item.to : null)}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary cursor-pointer",
                isParentActive ? "bg-muted text-primary" : "text-muted-foreground",
                "pr-2"
              )}>
                <NavLink to={item.to} className="flex items-center gap-3 flex-1" end={item.end} onClick={e => { e.preventDefault(); }}>
                  <item.icon className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <nav className={cn("grid items-start text-sm font-medium gap-1 ml-3 pl-6 border-l")}> 
                {renderNavLinks(item.children, isMobile, level + 1)}
              </nav>
            </CollapsibleContent>
          </Collapsible>
        );
      }

      // Nested submenus in expanded sidebar (desktop)
      if (!isCollapsed && !isMobile && level > 0 && item.children && item.children.length > 0) {
        const isOpen = !!openMenus[menuKey];
        return (
          <Collapsible
            key={item.label}
            open={isOpen}
            onOpenChange={() => toggleMenu(menuKey)}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary cursor-pointer",
                isParentActive ? "bg-muted text-primary" : "text-muted-foreground",
                "pr-2"
              )}>
                <NavLink to={item.to} className="flex items-center gap-3 flex-1" end={item.end} onClick={e => { e.preventDefault(); }}>
                  <item.icon className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <nav className={cn("grid items-start text-sm font-medium gap-1 ml-3 pl-6 border-l")}> 
                {renderNavLinks(item.children, isMobile, level + 1)}
              </nav>
            </CollapsibleContent>
          </Collapsible>
        );
      }

      // Mobile view: allow all levels to expand/collapse independently
      if (isMobile && item.children && item.children.length > 0) {
        const isOpen = !!openMenus[menuKey];
        return (
          <Collapsible
            key={item.label}
            open={isOpen}
            onOpenChange={() => toggleMenu(menuKey)}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary cursor-pointer",
                isParentActive ? "bg-muted text-primary" : "text-muted-foreground",
                "pr-2"
              )}>
                <span className="flex items-center gap-3 flex-1">
                  <item.icon className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <nav className={cn("grid items-start text-sm font-medium gap-1 ml-3 pl-6 border-l")}> 
                {renderNavLinks(item.children, isMobile, level + 1)}
              </nav>
            </CollapsibleContent>
          </Collapsible>
        );
      }

      // Regular NavLink item (all modes)
      return (
        <Tooltip key={item.label}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.to}
              className={isMobile ? mobileNavLinkClasses({ isActive }) : navLinkClasses({ isActive })}
              onClick={() => {
                if (isMobile) closeSheet();
                if (level === 0 && !isCollapsed && !isMobile) setOpenModulePath(null);
              }}
              end={item.end}
            >
              <item.icon className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
              <span className={cn(
                isMobile ? "truncate" : (isCollapsed ? "text-xs text-center break-words max-w-full" : "truncate")
              )}>
                {item.label}
              </span>
            </NavLink>
          </TooltipTrigger>
          {isCollapsed && !isMobile && (
            <TooltipContent side="right">{item.label}</TooltipContent>
          )}
        </Tooltip>
      );
    });
  };

  return (
    <TooltipProvider>
      <div className={cn("grid min-h-screen w-full md:grid-cols-[auto_1fr]")}>
        <div className={cn(
          "hidden border-r bg-muted/40 md:block transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-[220px] lg:w-[280px]"
        )}>
          <div className={cn(
            "flex h-14 items-center border-b px-4 lg:h-[60px]",
            isCollapsed ? "justify-center px-2" : "px-4 lg:px-6"
          )}>
            <NavLink to="/" className={cn("flex items-center gap-2 font-semibold", isCollapsed && "hidden")}>
              <Package className="h-6 w-6 text-primary" />
              <span>PurchaseTracker</span>
            </NavLink>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-8 w-8", !isCollapsed && "ml-auto")} onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                  <ChevronsLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 py-4 overflow-y-auto">
            <nav className="grid items-start px-2 text-sm font-medium gap-1">
              {renderNavLinks(navItems, false)}
            </nav>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10">
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
                <nav className="grid gap-2 text-lg font-medium overflow-y-auto py-4">
                  <NavLink to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary" onClick={closeSheet}>
                    <Package className="h-6 w-6 text-primary" />
                    <span className="text-lg font-semibold">PurchaseTracker</span>
                  </NavLink>
                  {renderNavLinks(navItems, true)}
                </nav>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold md:text-xl mr-auto">{currentPageTitle}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button ref={newActionButtonRef} size="sm" className="ml-auto sm:ml-4">
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New</span>
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>New (Ctrl+N)</p>
                  </TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => navigate('/purchase-module/purchase-invoice/new')}>New Purchase</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/sales-module/sales-invoice/new')}>New Sale</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/inventory-module/item-master', { state: { action: 'add-item' } })}>New Item</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/inventory-module/categories', { state: { action: 'add-category' } })}>New Category</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/sales-module/customers', { state: { action: 'add-customer' } })}>New Customer</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/purchase-module/suppliers', { state: { action: 'add-supplier' } })}>New Supplier</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/inventory-module/stock-adjustment')}>Stock Adjustment</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/accounts-module/expenses', { state: { action: 'add-expense' } })}>New Expense</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/sales-module/sales-return/new')}>New Sales Return</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/purchase-module/purchase-return/new')}>New Purchase Return</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/accounts-module/receipt-vouchers/new')}>New Receipt Voucher</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/accounts-module/payment-vouchers/new')}>New Payment Voucher</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-2 sm:p-4 bg-muted/20 overflow-y-auto">
            <Outlet key={location.pathname} />
          </main>
          <ChatbotTrigger onClick={() => setIsChatbotOpen(true)} />
          <ChatbotDialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Layout;