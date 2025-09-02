"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-provider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { EditSupplierDialog } from "@/components/edit-supplier-dialog";
import { DeleteSupplierAlert } from "@/components/delete-supplier-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PlusCircle, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function SuppliersPage() {
  const location = useLocation();
  const { user } = useAuth(); // Use useAuth
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: keyof Supplier; direction: SortDirection }>({
    column: "SupplierName",
    direction: "asc",
  });

  const fetchSuppliers = useCallback(async () => {
    if (!user?.id) { // Ensure user is logged in
      setLoading(false);
      return;
    }
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("SupplierMaster")
      .select("*", { count: "exact" })
      .eq("user_id", user.id); // Filter by user_id

    if (debouncedSearchTerm) {
      query = query.or(`SupplierName.ilike.%${debouncedSearchTerm}%,MobileNo.ilike.%${debouncedSearchTerm}%`);
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch suppliers", { description: error.message });
      setSuppliers([]);
    } else {
      setSuppliers(data);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, user?.id]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    const channel = supabase.channel('public:SupplierMaster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'SupplierMaster' },
        () => {
          toast.info("Suppliers have been updated. Refreshing list...");
          fetchSuppliers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSuppliers]);

  // Open AddSupplierDialog if state indicates 'add-supplier'
  useEffect(() => {
    if (location.state?.action === 'add-supplier') {
      setAddDialogOpen(true);
      // Clear the state after use to prevent re-triggering on subsequent renders
      window.history.replaceState({}, document.title); 
    }
  }, [location.state]);

  const handleSort = (column: keyof Supplier) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>Manage your supplier records.</CardDescription>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <span className="flex items-center">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>New</span>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add New Supplier (Ctrl+N)</p>
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
                    <Button variant="ghost" onClick={() => handleSort("SupplierId")}>
                      <span className="flex items-center">
                        <span>ID</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("SupplierName")}>
                      <span className="flex items-center">
                        <span>Name</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("MobileNo")}>
                      <span className="flex items-center">
                        <span>Mobile No.</span>
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
                      <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : suppliers.length > 0 ? (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.SupplierId}>
                      <TableCell className="font-mono text-xs">{supplier.SupplierId}</TableCell>
                      <TableCell className="font-medium">{supplier.SupplierName}</TableCell>
                      <TableCell>{supplier.MobileNo || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <EditSupplierDialog supplier={supplier} onSupplierUpdated={fetchSuppliers} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Supplier (Ctrl+E)</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DeleteSupplierAlert supplier={supplier} onSupplierDeleted={fetchSuppliers} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Supplier (Ctrl+D)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No results found.
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
      <AddSupplierDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSupplierAdded={fetchSuppliers}
      />
    </div>
  );
}

export default SuppliersPage;