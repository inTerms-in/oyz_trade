import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-provider.tsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, PlusCircle, LayoutDashboard, BarChart, Package, ShoppingCart, ShoppingBag, Tag, Users, ChevronsLeft, UserRound, Truck, ScanBarcode, TrendingUp, ReceiptText } from "lucide-react"; // Added ReceiptText for Expenses
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

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // Changed to true for default collapsed state

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

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/inventory", icon: Package, label: "Inventory" },
    { to: "/purchases", icon: ShoppingCart, label: "Purchases" },
    { to: "/sales", icon: ShoppingBag, label: "Sales" },
    { to: "/items", icon: Tag, label: "Items" },
    { to: "/categories", icon: Users, label: "Categories" },
    { to: "/customers", icon: UserRound, label: "Customers" },
    { to: "/suppliers", icon: Truck, label: "Suppliers" },
    { to: "/stock-adjustment", icon: TrendingUp, label: "Stock Adjustment" },
    { to: "/expenses", icon: ReceiptText, label: "Expenses" }, // New navigation item
    { to: "/barcode-print", icon: ScanBarcode, label: "Print Barcodes" },
    // { to: "/sample-print", icon: Printer, label: "Sample Print" }, Removed Sample Print
  ];

  const desktopNav = (
    <>
      {navItems.map((item) => (
        <NavLink key={item.label} to={item.to} className={navLinkClasses} end={item.end}>
          <item.icon className="h-5 w-5" />
          <span className={cn(
            !isCollapsed && "truncate",
            isCollapsed && "text-xs text-center break-words max-w-full"
          )}>
            {item.label}
          </span>
        </NavLink>
      ))}
    </>
  );

  const mobileNav = (
    <>
      {navItems.map((item) => (
        <NavLink key={item.label} to={item.to} className={mobileNavLinkClasses} onClick={closeSheet} end={item.end}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </>
  );

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
            <ChevronsLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
        <div className="flex-1 py-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {desktopNav}
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
                {mobileNav}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <div className="relative">
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
                  <DropdownMenuItem onSelect={() => navigate('/dashboards/purchase')}>Purchase Details</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/dashboards/sales')}>Sales Details</DropdownMenuItem>
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
              <DropdownMenuItem onSelect={() => navigate('/purchases/new')}>New Purchase</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/sales/new')}>New Sale</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/items')}>New Item</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/categories')}>New Category</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/customers')}>New Customer</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/suppliers')}>New Supplier</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/stock-adjustment')}>Stock Adjustment</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/expenses')}>New Expense</DropdownMenuItem> {/* Added to New dropdown */}
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
          <Outlet />
        </main>
        <ChatbotTrigger onClick={() => setIsChatbotOpen(true)} />
        <ChatbotDialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
      </div>
    </div>
  );
}

export default Layout;