"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemWithStock, Category } from "@/types";
import { toast } from "sonner";
import { AddItemDialog } from "@/components/add-item-dialog";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteItemAlert } from "@/components/delete-item-alert";
import { BarcodePrintDialog } from "@/components/barcode-print-dialog";
import { useLocation } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, ScanBarcode, Printer } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog"; // Import BarcodeScannerDialog

export default function InventoryPage() {
  const [data, setData] = useState<ItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  // Removed isEditItemDialogOpen and isDeleteDialogOpen as they are not directly used to control dialog open state
  const [selectedItem, setSelectedItem] = useState<ItemWithStock | null>(null);
  const [categories, setCategories] = useState<Category[]>([]); // Keep categories if needed for AddItemDialog/EditItemDialog
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBarcodePrintOpen, setIsBarcodePrintOpen] = useState(false);
  const location = useLocation();

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from("CategoryMaster").select("*");
    if (error) {
      toast.error("Failed to fetch categories", { description: error.message });
    } else {
      setCategories(data || []);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Fetch from the item_stock_details view for accurate stock
    const { data: items, error } = await supabase
      .from("item_stock_details")
      .select("*")
      .order("ItemName", { ascending: true });

    if (error) {
      toast.error("Failed to fetch items", { description: error.message });
      setData([]);
    } else {
      setData(items || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchData();
  }, [fetchCategories, fetchData]);

  useEffect(() => {
    if (location.state?.action === 'add-item') {
      setIsAddItemDialogOpen(true);
      // Clear the state to prevent re-triggering on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const columns: ColumnDef<ItemWithStock>[] = useMemo(
    () => [
      {
        accessorKey: "ItemCode",
        header: "Item Code",
      },
      {
        accessorKey: "ItemName",
        header: "Item Name",
      },
      {
        accessorKey: "CategoryName",
        header: "Category",
      },
      {
        accessorKey: "Barcode",
        header: "Barcode",
      },
      {
        accessorKey: "RackNo",
        header: "Rack No.",
      },
      {
        accessorKey: "SellPrice",
        header: "Sell Price",
        cell: ({ row }) => (row.original.SellPrice ? `₹${row.original.SellPrice.toFixed(2)}` : "N/A"),
      },
      {
        accessorKey: "current_stock",
        header: "Current Stock",
        cell: ({ row }) => row.original.current_stock || 0,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(row.original)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const handleAddItem = () => {
    setIsAddItemDialogOpen(true);
  };

  const handleEdit = (item: ItemWithStock) => {
    setSelectedItem(item);
    // Dialog will open based on selectedItem presence
  };

  const handleDelete = (item: ItemWithStock) => {
    setSelectedItem(item);
    // Dialog will open based on selectedItem presence
  };

  const handleItemAdded = () => {
    fetchData();
    setIsAddItemDialogOpen(false);
  };

  const handleItemUpdated = () => {
    fetchData();
    setSelectedItem(null); // Close dialog by clearing selected item
  };

  const handleItemDeleted = () => {
    fetchData();
    setSelectedItem(null); // Close dialog by clearing selected item
  };

  const handleScan = (barcode: string) => {
    const foundItem = data.find(item => item.Barcode === barcode);
    if (foundItem) {
      toast.info(`Item found: ${foundItem.ItemName} (Stock: ${foundItem.current_stock})`);
      // Optionally, you could open the edit dialog for this item
      // handleEdit(foundItem);
    } else {
      toast.error("Item not found", { description: "No item in your master list matches this barcode." });
    }
    setIsScannerOpen(false);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Inventory</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
              <ScanBarcode className="mr-2 h-4 w-4" />
              Scan Barcode
            </Button>
            <Button variant="outline" onClick={() => setIsBarcodePrintOpen(true)}>
              <Printer className="mr-2 h-4 w-4" />
              Print Barcodes
            </Button>
            <Button onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <Input
              placeholder="Search items..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-sm"
            />
          </div>
          <DataTable columns={columns} data={data} loading={loading} globalFilter={globalFilter} />
        </CardContent>
      </Card>

      <AddItemDialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen} onItemAdded={handleItemAdded} />
      {selectedItem && (
        <>
          <EditItemDialog item={selectedItem} onItemUpdated={handleItemUpdated} />
          <DeleteItemAlert item={selectedItem} onItemDeleted={handleItemDeleted} />
        </>
      )}
      <BarcodeScannerDialog open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScan} />
      <BarcodePrintDialog open={isBarcodePrintOpen} onOpenChange={setIsBarcodePrintOpen} items={data} />
    </div>
  );
}