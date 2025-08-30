"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn, generateItemCode } from "@/lib/utils";
import { SaleWithItems } from "@/types";
import { useAuth } from "@/contexts/auth-provider";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/autocomplete";

const salesReturnFormSchema = z.object({
  SaleId: z.coerce.number({ required_error: "Please select an original sale." }),
  ReturnDate: z.date(),
  Reason: z.string().optional().nullable(),
});

type SalesReturnFormValues = z.infer<typeof salesReturnFormSchema>;

interface ReturnableItem {
  SalesItemId: number; // Original SalesItem ID
  ItemId: number;
  ItemName: string;
  ItemCode?: string | null;
  CategoryName?: string;
  QtySold: number; // Quantity originally sold
  QtyReturned: number; // Quantity being returned in this form
  Unit: string;
  UnitPrice: number; // Original unit price
  TotalPrice: number; // QtyReturned * UnitPrice
}

function NewSalesReturnPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [saleSuggestions, setSaleSuggestions] = useState<SaleWithItems[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [returnableItems, setReturnableItems] = useState<ReturnableItem[]>([]);
  const [displaySaleName, setDisplaySaleName] = useState(""); // New state for Autocomplete input text

  const form = useForm<SalesReturnFormValues>({
    resolver: zodResolver(salesReturnFormSchema),
    mode: "onChange",
    defaultValues: { SaleId: undefined, ReturnDate: new Date(), Reason: "" },
  });

  const watchedSaleId = form.watch("SaleId");
  const totalRefundAmount = returnableItems.reduce((sum, item) => sum + item.TotalPrice, 0);

  const fetchSalesSuggestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("Sales")
      .select("*, SalesItem(*, ItemMaster(ItemName, ItemCode, CategoryMaster(CategoryName))), CustomerMaster(CustomerName))")
      .order("SaleDate", { ascending: false })
      .limit(20); // Fetch recent sales for suggestions

    if (error) {
      toast.error("Failed to fetch sales suggestions", { description: error.message });
    } else {
      setSaleSuggestions(data as unknown as SaleWithItems[]); // Explicit cast
    }
  }, []);

  useEffect(() => {
    fetchSalesSuggestions();
  }, [fetchSalesSuggestions]);

  useEffect(() => {
    if (watchedSaleId) {
      const sale = saleSuggestions.find(s => s.SaleId === watchedSaleId);
      setSelectedSale(sale || null);
      if (sale) {
        setDisplaySaleName(sale.ReferenceNo || `Sale ${sale.SaleId} (${sale.CustomerMaster?.CustomerName || 'N/A'})`);
        // Initialize returnable items from the selected sale's items
        const items = sale.SalesItem.map(item => ({
          SalesItemId: item.SalesItemId,
          ItemId: item.ItemId,
          ItemName: item.ItemMaster?.ItemName || 'Unknown Item',
          ItemCode: item.ItemMaster?.ItemCode || generateItemCode(item.ItemMaster?.CategoryMaster?.CategoryName, item.ItemId),
          CategoryName: item.ItemMaster?.CategoryMaster?.CategoryName,
          QtySold: item.Qty,
          QtyReturned: 0, // Default to 0 returned
          Unit: item.Unit,
          UnitPrice: item.UnitPrice,
          TotalPrice: 0,
        }));
        setReturnableItems(items);
      } else {
        setDisplaySaleName("");
        setReturnableItems([]);
      }
    } else {
      setSelectedSale(null);
      setDisplaySaleName("");
      setReturnableItems([]);
    }
  }, [watchedSaleId, saleSuggestions]);

  const handleQtyReturnedChange = (index: number, value: number) => {
    const updatedItems = [...returnableItems];
    const item = updatedItems[index];
    const newQty = Math.max(0, Math.min(value, item.QtySold)); // Cannot return more than sold
    item.QtyReturned = newQty;
    item.TotalPrice = parseFloat((newQty * item.UnitPrice).toFixed(2));
    setReturnableItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...returnableItems];
    updatedItems.splice(index, 1);
    setReturnableItems(updatedItems);
  };

  async function onSubmit(values: SalesReturnFormValues) {
    if (!user?.id) return toast.error("Authentication error. Please log in again.");
    if (!selectedSale) return toast.error("Please select an original sale.");

    const itemsToReturn = returnableItems.filter(item => item.QtyReturned > 0);
    if (itemsToReturn.length === 0) return toast.error("Please specify at least one item to return.");

    setIsSubmitting(true);

    const { data: refNoData, error: refNoError } = await supabase.rpc('generate_sales_return_reference_no', { p_user_id: user.id });

    if (refNoError || !refNoData) {
      toast.error("Failed to generate sales return reference number", { description: refNoError?.message });
      setIsSubmitting(false);
      return;
    }

    const { data: salesReturnData, error: salesReturnError } = await supabase
      .from("SalesReturn")
      .insert({
        SaleId: values.SaleId,
        ReturnDate: values.ReturnDate.toISOString(),
        TotalRefundAmount: totalRefundAmount,
        Reason: values.Reason || null,
        ReferenceNo: refNoData,
      })
      .select()
      .single();

    if (salesReturnError || !salesReturnData) {
      toast.error("Failed to create sales return", { description: salesReturnError?.message });
      setIsSubmitting(false);
      return;
    }

    const salesReturnItems = itemsToReturn.map(item => ({
      SalesReturnId: salesReturnData.SalesReturnId,
      ItemId: item.ItemId,
      Qty: item.QtyReturned,
      Unit: item.Unit,
      UnitPrice: item.UnitPrice,
    }));

    const { error: salesReturnItemsError } = await supabase
      .from("SalesReturnItem")
      .insert(salesReturnItems);

    if (salesReturnItemsError) {
      toast.error("Failed to save sales return items. Rolling back.", {
        description: salesReturnItemsError.message || "An unknown error occurred. The sales return was not saved."
      });
      await supabase.from("SalesReturn").delete().eq("SalesReturnId", salesReturnData.SalesReturnId);
      setIsSubmitting(false);
      return;
    }

    // Update stock for each returned item
    for (const item of itemsToReturn) {
      const { error: stockError } = await supabase
        .from("StockAdjustment")
        .insert({
          ItemId: item.ItemId,
          AdjustmentType: 'in', // Stock increases on return
          Quantity: item.QtyReturned,
          Reason: `Sales Return (Ref: ${refNoData})`,
        });
      if (stockError) {
        console.error(`Failed to update stock for item ${item.ItemName}:`, stockError.message);
        // Decide if you want to roll back or just log. For now, log and continue.
      }
    }

    setIsSubmitting(false);
    toast.success(`Sales Return ${refNoData} added successfully!`);
    navigate("/sales-module/sales-return");
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>New Sales Return</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="SaleId"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <Label htmlFor="sale-autocomplete">Original Sale</Label>
                      <FormControl>
                        <Autocomplete<SaleWithItems>
                          id="sale-autocomplete"
                          suggestions={saleSuggestions}
                          value={displaySaleName} // Use displaySaleName for input value
                          onValueChange={(v) => {
                            setDisplaySaleName(v);
                            // If the user types and it no longer matches the selected sale, clear the form's SaleId
                            const matchedSale = saleSuggestions.find(s => (s.ReferenceNo === v || `Sale ${s.SaleId} (${s.CustomerMaster?.CustomerName || 'N/A'})` === v));
                            if (!matchedSale || matchedSale.SaleId !== selectedSale?.SaleId) {
                                field.onChange(undefined);
                                setSelectedSale(null); // Also clear selectedSale
                            }
                          }}
                          onSelect={(sale) => {
                            field.onChange(sale.SaleId);
                            setSelectedSale(sale); // Set selected sale
                            setDisplaySaleName(sale.ReferenceNo || `Sale ${sale.SaleId} (${sale.CustomerMaster?.CustomerName || 'N/A'})`); // Update display name
                          }}
                          placeholder="Search by Sale Ref No or Customer Name..."
                          getId={(s) => s.SaleId}
                          getName={(s) => s.ReferenceNo || `Sale ${s.SaleId} (${s.CustomerMaster?.CustomerName || 'N/A'})`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="ReturnDate" render={({ field }) => (
                  <FormItem>
                    <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                      <div className="relative">
                        <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Return Date</Label>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full justify-start pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}>
                              <span className="flex items-center">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                <span>{field.value ? format(field.value, "PPP") : ""}</span>
                              </span>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                      </div>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setDatePickerOpen(false);}} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 10} toYear={new Date().getFullYear()} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {selectedSale && (
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Original Sale Details</h3>
                  <p><strong>Ref No:</strong> {selectedSale.ReferenceNo}</p>
                  <p><strong>Customer:</strong> {selectedSale.CustomerMaster?.CustomerName || 'Walk-in Customer'}</p>
                  <p><strong>Sale Date:</strong> {format(parseISO(selectedSale.SaleDate), "PPP")}</p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedSale.TotalAmount)}</p>

                  <h3 className="font-semibold mt-4">Items from Sale (Select for Return)</h3>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Qty Sold</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-center">Qty to Return</TableHead>
                          <TableHead className="text-right">Total Refund</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnableItems.length > 0 ? (
                          returnableItems.map((item, index) => (
                            <TableRow key={item.SalesItemId}>
                              <TableCell className="font-medium">{item.ItemName}</TableCell>
                              <TableCell className="font-mono text-xs">{item.ItemCode}</TableCell>
                              <TableCell className="text-right">{item.QtySold}</TableCell>
                              <TableCell>{item.Unit}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.UnitPrice)}</TableCell>
                              <TableCell className="text-center">
                                <FloatingLabelInput
                                  id={`qty-return-${index}`}
                                  label=" "
                                  type="number"
                                  value={item.QtyReturned}
                                  onChange={(e) => handleQtyReturnedChange(index, e.target.valueAsNumber)}
                                  min={0}
                                  max={item.QtySold}
                                  className="w-20 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.TotalPrice)}</TableCell>
                              <TableCell className="text-right">
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} aria-label="Remove item">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                              No items in this sale.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="Reason"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="Reason">Reason for Return (Optional)</Label>
                    <FormControl>
                      <Textarea
                        id="Reason"
                        placeholder="e.g., Customer changed mind, damaged item, wrong item delivered"
                        className="resize-y min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4 pt-4">
                <div className="flex space-x-2 w-full sm:w-auto">
                  <Link to="/sales-module/sales-return" className="flex-1 sm:flex-none"><Button type="button" variant="outline" className="w-full">Cancel</Button></Link>
                  <Button type="submit" disabled={isSubmitting || !form.formState.isValid || totalRefundAmount <= 0} className="flex-1 sm:flex-none">{isSubmitting ? "Saving..." : "Record Sales Return"}</Button>
                </div>
                <div className="w-full sm:w-auto sm:max-w-xs space-y-1 text-sm self-end">
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base">
                        <span>Total Refund Amount</span>
                        <span>{formatCurrency(totalRefundAmount)}</span>
                    </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default NewSalesReturnPage;