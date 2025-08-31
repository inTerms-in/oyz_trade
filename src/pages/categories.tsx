"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-provider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddCategoryDialog } from "@/components/add-category-dialog";
import { EditCategoryDialog } from "@/components/edit-category-dialog";
import { DeleteCategoryAlert } from "@/components/delete-category-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PlusCircle, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function CategoriesPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: keyof Category; direction: SortDirection }>({
    column: "CategoryName",
    direction: "asc",
  });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("CategoryMaster")
      .select("*", { count: "exact" });

    if (debouncedSearchTerm) {
      query = query.ilike("CategoryName", `%${debouncedSearchTerm}%`);
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch categories", { description: error.message });
      setCategories([]);
    } else {
      setCategories(data);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const channel = supabase.channel('public:CategoryMaster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CategoryMaster' },
        () => {
          toast.info("Categories have been updated. Refreshing list...");
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCategories]);

  // Open AddCategoryDialog if state indicates 'add-category'
  useEffect(() => {
    if (location.state?.action === 'add-category') {
      setAddDialogOpen(true);
      // Clear the state after use to prevent re-triggering on subsequent renders
      window.history.replaceState({}, document.title); 
    }
  }, [location.state]);

  const handleSort = (column: keyof Category) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Manage your item categories.</CardDescription>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Input
                placeholder="Search categories..."
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
                  <p>Add New Category (Ctrl+N)</p>
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
                    <Button variant="ghost" onClick={() => handleSort("CategoryId")}>
                      <span className="flex items-center">
                        <span>ID</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CategoryName")}>
                      <span className="flex items-center">
                        <span>Name</span>
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
                      <TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : categories.length > 0 ? (
                  categories.map((category) => (
                    <TableRow key={category.CategoryId}>
                      <TableCell className="font-mono text-xs">{category.CategoryId}</TableCell>
                      <TableCell className="font-medium">{category.CategoryName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <EditCategoryDialog category={category} onCategoryUpdated={fetchCategories} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Category (Ctrl+E)</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DeleteCategoryAlert category={category} onCategoryDeleted={fetchCategories} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Category (Ctrl+D)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
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
      <AddCategoryDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCategoryAdded={fetchCategories}
      />
    </div>
  );
}

export default CategoriesPage;