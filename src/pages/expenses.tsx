"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Expense, ExpenseCategory } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-provider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PlusCircle, ArrowUpDown, Filter } from "lucide-react";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { EditExpenseDialog } from "@/components/edit-expense-dialog";
import { DeleteExpenseAlert } from "@/components/delete-expense-alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function ExpensesPage() {
  const location = useLocation();
  const { user } = useAuth(); // Use useAuth
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "ExpenseDate",
    direction: "desc",
  });
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);


  const fetchExpenses = useCallback(async () => {
    if (!user?.id) { // Ensure user is logged in
      setLoading(false);
      return;
    }
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("Expenses")
      .select("*, ExpenseCategoryMaster(CategoryName)", { count: "exact" })
      .eq("user_id", user.id); // Filter by user_id

    if (debouncedSearchTerm) {
      query = query.or(`Description.ilike.%${debouncedSearchTerm}%,ReferenceNo.ilike.%${debouncedSearchTerm}%`);
    }

    if (filterCategory !== "all") {
      query = query.eq("ExpenseCategoryId", parseInt(filterCategory));
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch expenses", { description: error.message });
      setExpenses([]);
    } else {
      setExpenses(data as Expense[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, filterCategory, user?.id]);

  const fetchExpenseCategories = useCallback(async () => {
    if (!user?.id) return; // Ensure user is logged in
    const { data, error } = await supabase
      .from("ExpenseCategoryMaster")
      .select("*")
      .eq("user_id", user.id) // Filter by user_id
      .order("CategoryName");
    if (error) {
      toast.error("Failed to fetch expense categories", { description: error.message });
    } else {
      setExpenseCategories(data || []);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchExpenseCategories();
  }, [fetchExpenseCategories]);
  
  useEffect(() => {
    const channel = supabase.channel('public:Expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Expenses' },
        () => {
          toast.info("Expenses have been updated. Refreshing list...");
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchExpenses]);

  useEffect(() => {
    const channel = supabase.channel('public:ExpenseCategoryMaster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ExpenseCategoryMaster' },
        () => {
          toast.info("Expense categories have been updated. Refreshing filters and list...");
          fetchExpenseCategories();
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchExpenseCategories, fetchExpenses]);

  // Open AddExpenseDialog if state indicates 'add-expense'
  useEffect(() => {
    if (location.state?.action === 'add-expense') {
      setAddDialogOpen(true);
      // Clear the state after use to prevent re-triggering on subsequent renders
      window.history.replaceState({}, document.title); 
    }
  }, [location.state]);

  const handleSort = (column: string) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>Manage your business expenses.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search description or ref no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    {filterCategory === "all" ? "All Categories" : expenseCategories.find(c => String(c.ExpenseCategoryId) === filterCategory)?.CategoryName || "Filter Category"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={filterCategory} onValueChange={setFilterCategory}>
                    <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                    {expenseCategories.map((category) => (
                      <DropdownMenuRadioItem key={category.ExpenseCategoryId} value={String(category.ExpenseCategoryId)}>
                        {category.CategoryName}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto">
                    <span className="flex items-center">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>New Expense</span>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add New Expense (Ctrl+N)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ExpenseDate")}>
                      <span className="flex items-center">
                        <span>Date</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("Description")}>
                      <span className="flex items-center">
                        <span>Description</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ExpenseCategoryMaster.CategoryName")}>
                      <span className="flex items-center">
                        <span>Category</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ReferenceNo")}>
                      <span className="flex items-center">
                        <span>Ref No.</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort("Amount")}>
                      <span className="flex items-center">
                        <span>Amount</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(pageSize)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <TableRow key={expense.ExpenseId}>
                      <TableCell>{format(new Date(expense.ExpenseDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{expense.Description}</TableCell>
                      <TableCell>{expense.ExpenseCategoryMaster?.CategoryName || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{expense.ReferenceNo || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.Amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <EditExpenseDialog expense={expense} onExpenseUpdated={fetchExpenses} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Expense (Ctrl+E)</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DeleteExpenseAlert expense={expense} onExpenseDeleted={fetchExpenses} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Expense (Ctrl+D)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            pageIndex={pageIndex}
            pageCount={pageCount}
            pageSize={pageSize}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            itemCount={itemCount}
          />
        </CardContent>
      </Card>
      <AddExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onExpenseAdded={fetchExpenses}
      />
    </div>
  );
}

export default ExpensesPage;