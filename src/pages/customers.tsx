"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
// Removed useAuth import as user_id filtering is no longer applied

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { EditCustomerDialog } from "@/components/edit-customer-dialog";
import { DeleteCustomerAlert } from "@/components/delete-customer-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PlusCircle, ArrowUpDown } from "lucide-react";

type SortDirection = "asc" | "desc";

function CustomersPage() {
  // Removed user from useAuth
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: keyof Customer; direction: SortDirection }>({
    column: "CustomerName",
    direction: "asc",
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("CustomerMaster")
      .select("*", { count: "exact" });
      // Removed .eq("user_id", user.id)

    if (debouncedSearchTerm) {
      query = query.or(`CustomerName.ilike.%${debouncedSearchTerm}%,MobileNo.ilike.%${debouncedSearchTerm}%`);
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch customers", { description: error.message });
      setCustomers([]);
    } else {
      setCustomers(data);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort]); // Removed user.id from dependencies

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const channel = supabase.channel('public:CustomerMaster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CustomerMaster' },
        () => {
          toast.info("Customers have been updated. Refreshing list...");
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCustomers]);

  const handleSort = (column: keyof Customer) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Manage your customer records.</CardDescription>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Button onClick={() => setAddDialogOpen(true)}>
                <span className="flex items-center">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>New</span>
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CustomerId")}>
                      <span className="flex items-center">
                        <span>ID</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CustomerName")}>
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
                ) : customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.CustomerId}>
                      <TableCell className="font-mono text-xs">{customer.CustomerId}</TableCell>
                      <TableCell className="font-medium">{customer.CustomerName}</TableCell>
                      <TableCell>{customer.MobileNo || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <EditCustomerDialog customer={customer} onCustomerUpdated={fetchCustomers} />
                          <DeleteCustomerAlert customer={customer} onCustomerDeleted={fetchCustomers} />
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
      <AddCustomerDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCustomerAdded={fetchCustomers}
      />
    </div>
  );
}

export default CustomersPage;