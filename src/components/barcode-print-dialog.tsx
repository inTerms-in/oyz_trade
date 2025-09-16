"use client";

import { useState, useEffect, useRef } from "react";
import { ItemWithStock, PrintableItem } from "@/types";
import { useDebounce } from "@/hooks/use-debounce";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Printer, ArrowUpDown } from "lucide-react";
import { PrintableBarcodes } from "@/components/printable-barcodes";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemWithStock[];
}

type SortDirection = "asc" | "desc";

export function BarcodePrintDialog({ open, onOpenChange, items }: BarcodePrintDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filteredItems, setFilteredItems] = useState<ItemWithStock[]>([]);
  const [selectedItems, setSelectedItems] = useState<PrintableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "ItemName",
    direction: "asc",
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    let currentFiltered = [...items];

    if (debouncedSearchTerm) {
      currentFiltered = currentFiltered.filter(item =>
        item.ItemName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.ItemCode?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.Barcode?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    currentFiltered.sort((a, b) => {
      const aValue = (a as any)[sort.column] || "";
      const bValue = (b as any)[sort.column] || "";
      if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredItems(currentFiltered);
    setLoading(false);
  }, [items, debouncedSearchTerm, sort]);

  const handlePrint = () => {
    window.print();
  };

  const handleSort = (column: string) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemsAsPrintable = filteredItems.map(item => ({
        ...item,
        CategoryMaster: null,
        quantityToPrint: 1,
      })) as PrintableItem[];
      setSelectedItems(allItemsAsPrintable);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (item: ItemWithStock, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        ...item,
        CategoryMaster: null,
        quantityToPrint: 1,
      } as PrintableItem]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected.ItemId !== item.ItemId));
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.ItemId === itemId ? { ...item, quantityToPrint: Math.max(1, quantity) } : item
      )
    );
  };

  const isItemSelected = (itemId: number) => selectedItems.some(item => item.ItemId === itemId);
  const isAllSelected = filteredItems.length > 0 && selectedItems.length === filteredItems.length;
  const totalLabelsToPrint = selectedItems.reduce((sum, item) => sum + item.quantityToPrint, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Print Barcodes</DialogTitle>
          <DialogDescription>
            Select items and specify quantities to print their barcodes.
          </DialogDescription>
        </DialogHeader>
        <div className="print-only">
          <PrintableBarcodes itemsToPrint={selectedItems} ref={printRef} />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center py-4">
            <Input
              placeholder="Search items by name, code or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handlePrint} disabled={selectedItems.length === 0 || totalLabelsToPrint === 0} className="ml-auto">
                  <span className="flex items-center">
                    <Printer className="mr-2 h-4 w-4" />
                    <span>Print ({totalLabelsToPrint})</span>
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print Barcodes (Ctrl+P)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="rounded-md border flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                      aria-label="Select all items"
                    />
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ItemCode")}>
                      <span className="flex items-center">
                        <span>Item Code</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ItemName")}>
                      <span className="flex items-center">
                        <span>Name</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CategoryName")}>
                      <span className="flex items-center">
                        <span>Category</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Barcode</TableHead>
                  <TableHead className="w-[100px] text-center">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const selectedItemData = selectedItems.find(s => s.ItemId === item.ItemId);
                    return (
                      <TableRow key={item.ItemId}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isItemSelected(item.ItemId)}
                            onCheckedChange={(checked: boolean) => handleSelectItem(item, checked)}
                            aria-label={`Select item ${item.ItemName}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.ItemCode || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{item.ItemName}</TableCell>
                        <TableCell>{item.CategoryName || 'N/A'}</TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {item.Barcode || <span className="text-muted-foreground text-xs">No Barcode</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {isItemSelected(item.ItemId) && (
                            <FloatingLabelInput
                              id={`qty-${item.ItemId}`}
                              label=" "
                              type="number"
                              value={selectedItemData?.quantityToPrint || 1}
                              onChange={(e) => handleQuantityChange(item.ItemId, e.target.valueAsNumber)}
                              min={1}
                              className="w-20 text-center"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}