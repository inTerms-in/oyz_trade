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
import { PurchaseWithItems } from "@/types";
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

const purchaseReturnFormSchema = z.object({
  PurchaseId: z.coerce.number({ required_error: "Please select an original purchase." }),
  ReturnDate: z.date(),
  Reason: z.string().optional().nullable(),
  purchaseSearchText: z.string().optional(), // New field to hold the autocomplete text
});

type PurchaseReturnFormValues = z.infer<typeof purchaseReturnFormSchema>;

interface ReturnableItem {
  PurchaseItemId: number; // Original PurchaseItem ID
  ItemId: number;
  ItemName: string;
  ItemCode?: string | null;
  CategoryName?: string;
  QtyPurchased: number; // Quantity originally purchased
  QtyReturned: number; // Quantity being returned in this form
  Unit: string;
  UnitPrice: number; // Original unit price
  TotalPrice: number; // QtyReturned * UnitPrice
}

function NewPurchaseReturnPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<PurchaseWithItems[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithItems | null>(null);
  const [returnableItems, setReturnableItems] = useState<ReturnableItem[]>([]);

  const form = useForm<PurchaseReturnFormValues>({
    resolver: zodResolver(purchaseReturnFormSchema),
    mode: "onChange",
    defaultValues: { PurchaseId: undefined, ReturnDate: new Date(), Reason: "", purchaseSearchText: "" },
  });

  const watchedPurchaseId = form.watch("PurchaseId");
  const watchedPurchaseSearchText = form.watch("purchaseSearchText"); // Watch the new search text field
  const totalRefundAmount = returnableItems.reduce((sum, item) => sum + item.TotalPrice, 0);

  const fetchPurchaseSuggestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("Purchase")
      .select("*, PurchaseItem(*, ItemMaster(ItemName, ItemCode, CategoryMaster(CategoryName))), SupplierMaster(SupplierName))")
      .order("PurchaseDate", { ascending: false })
      .limit(20); // Fetch recent purchases for suggestions

    if (error) {
      toast.error("Failed to fetch purchase suggestions", { description: error.message });
    } else {
      setPurchaseSuggestions(data as unknown as PurchaseWithItems[]); // Explicit cast
    }
  }, []);

  useEffect(() => {
    fetchPurchaseSuggestions();
  }, [fetchPurchaseSuggestions]);

  useEffect(() => {
    if (watchedPurchaseId) {
      const purchase = purchaseSuggestions.find(s => s.PurchaseId === watchedPurchaseId);
      setSelectedPurchase(purchase || null);
      if (purchase) {
        // Initialize returnable items from the selected purchase's items
        const items = purchase.PurchaseItem.map(item => ({
          PurchaseItemId: item.PurchaseItemId,
          ItemId: item.ItemId,
          ItemName: item.ItemMaster?.ItemName || 'Unknown Item',
          ItemCode: item.ItemMaster?.ItemCode || generateItemCode(item.ItemMaster?.CategoryMaster?.CategoryName, item.ItemId),
          CategoryName: item.ItemMaster?.CategoryMaster?.CategoryName,
          QtyPurchased: item.Qty,
          QtyReturned: 0, // Default to 0 returned
          Unit: item.Unit,
          UnitPrice: item.UnitPrice,
          TotalPrice: 0,
        }));
        setReturnableItems(items);
        // Update the search text field to reflect the selected purchase's name
        form.setValue("purchaseSearchText", purchase.ReferenceNo || `Purchase ${purchase.PurchaseId} (${purchase.SupplierMaster?.SupplierName || 'N/A'})`, { shouldValidate: true });
      } else {
        setReturnableItems([]);
        form.setValue("purchaseSearchText", "", { shouldValidate: true });
      }
    } else {
      setSelectedPurchase(null);
      setReturnableItems([]);
      // If PurchaseId is cleared, also clear the search text unless user is actively typing
      if (!watchedPurchaseSearchText) {
        form.setValue("purchaseSearchText", "", { shouldValidate: true });
      }
    }
  }, [watchedPurchaseId, purchaseSuggestions, form, watchedPurchaseSearchText]);

  const handleQtyReturnedChange = (index: number, value: number) => {
    const updatedItems = [...returnableItems];
    const item = updatedItems[index];
    const newQty = Math.max(0, Math.min(value, item.QtyPurchased)); // Cannot return more than purchased
    item.QtyReturned = newQty;
    item.TotalPrice = parseFloat((newQty * item.UnitPrice).toFixed(2));
    setReturnableItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...returnableItems];
    updatedItems.splice(index, 1);
    setReturnableItems(updatedItems);
  };

  async function onSubmit(values: PurchaseReturnFormValues) {
    if (!user?.id) return toast.error("Authentication error. Please log in again.");
    if (!selectedPurchase) return toast.error("Please select an original purchase.");

    const itemsToReturn = returnableItems.filter(item => item.QtyReturned > 0);
    if (itemsToReturn.length === 0) return toast.error("Please specify at least one item to return.");

    setIsSubmitting(true);

    const { data: refNoData, error: refNoError } = await supabase.rpc('generate_purchase_return_reference_no', { p_user_id: user.id });

    if (refNoError || !refNoData) {
      toast.error("Failed to generate purchase return reference number", { description: refNoError?.message });
      setIsSubmitting(false);
      return;
    }

    const { data: purchaseReturnData, error: purchaseReturnError } = await supabase
      .from("PurchaseReturn")
      .insert({
        PurchaseId: values.PurchaseId,
        ReturnDate: values.ReturnDate.toISOString(),
        TotalRefundAmount: totalRefundAmount,
        Reason: values.Reason || null,
        ReferenceNo: refNoData,
      })
      .select()
      .single();

    if (purchaseReturnError || !purchaseReturnData) {
      toast.error("Failed to create purchase return", { description: purchaseReturnError?.message });
      setIsSubmitting(false);
      return;
    }

    const purchaseReturnItems = itemsToReturn.map(item => ({
      PurchaseReturnId: purchaseReturnData.PurchaseReturnId,
      ItemId: item.ItemId,
      Qty: item.QtyReturned,
      Unit: item.Unit,
      UnitPrice: item.UnitPrice,
    }));

    const { error: purchaseReturnItemsError } = await supabase
      .from("PurchaseReturnItem")
      .insert(purchaseReturnItems);

    if (purchaseReturnItemsError) {
      toast.error("Failed to save purchase return items. Rolling back.", {
        description: purchaseReturnItemsError.message || "An unknown error occurred. The purchase return was not saved."
      });
      await supabase.from("PurchaseReturn").delete().eq("PurchaseReturnId", purchaseReturnData.PurchaseReturnId);
      setIsSubmitting(false);
      return;
    }

    // Update stock for each returned item (stock decreases)
    for (const item of itemsToReturn) {
      const { error: stockError } = await supabase
        .from("StockAdjustment")
        .insert({
          ItemId: item.ItemId,
          AdjustmentType: 'out', // Stock decreases on return to supplier
          Quantity: item.QtyReturned,
          Reason: `Purchase Return (Ref: ${refNoData})`,
        });
      if (stockError) {
        console.error(`Failed to update stock for item ${item.ItemName}:`, stockError.message);
        // Decide if you want to roll back or just log. For now, log and continue.
      }
    }

    setIsSubmitting(false);
    toast.success(`Purchase Return ${refNoData} added successfully!`);
    navigate("/purchase-module/purchase-return");
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>New Purchase Return</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchaseSearchText" // Use the new search text field for the Autocomplete's value
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <Label htmlFor="purchase-autocomplete">Original Purchase</Label>
                      <FormControl>
                        <Autocomplete<PurchaseWithItems>
                          id="purchase-autocomplete"
                          suggestions={purchaseSuggestions}
                          value={field.value ?? ""} // Bind Autocomplete's value to purchaseSearchText
                          onValueChange={(v) => {
                            field.onChange(v); // Update purchaseSearchText
                            // If the typed value no longer matches a selected purchase, clear PurchaseId
                            const matchedPurchase = purchaseSuggestions.find(s => (s.ReferenceNo === v || `Purchase ${s.PurchaseId} (${s.SupplierMaster?.SupplierName || 'N/A'})` === v));
                            if (!matchedPurchase) {
                              form.setValue("PurchaseId", undefined, { shouldValidate: true });
                            }
                          }}
                          onSelect={(purchase) => {
                            form.setValue("PurchaseId", purchase.PurchaseId, { shouldValidate: true }); // Set PurchaseId on selection
                            field.onChange(purchase.ReferenceNo || `Purchase ${purchase.PurchaseId} (${purchase.SupplierMaster?.SupplierName || 'N/A'})`); // Update search text to selected item's display name
                          }}
                          placeholder="Search by Purchase Ref No or Supplier Name..."
                          getId={(s) => s.PurchaseId}
                          getName={(s) => s.ReferenceNo || `Purchase ${s.PurchaseId} (${s.SupplierMaster?.SupplierName || 'N/A'})`}
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

              {selectedPurchase && (
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Original Purchase Details</h3>
                  <p><strong>Ref No:</strong> {selectedPurchase.ReferenceNo}</p>
                  <p><strong>Supplier:</strong> {selectedPurchase.SupplierMaster?.SupplierName || 'N/A'}</p>
                  <p><strong>Purchase Date:</strong> {format(parseISO(selectedPurchase.PurchaseDate), "PPP")}</p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedPurchase.TotalAmount)}</p>

                  <h3 className="font-semibold mt-4">Items from Purchase (Select for Return)</h3>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Qty Purchased</TableHead>
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
                            <TableRow key={item.PurchaseItemId}>
                              <TableCell className="font-medium">{item.ItemName}</TableCell>
                              <TableCell className="font-mono text-xs">{item.ItemCode}</TableCell>
                              <TableCell className="text-right">{item.QtyPurchased}</TableCell>
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
                                  max={item.QtyPurchased}
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
                              No items in this purchase.
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
                        placeholder="e.g., Damaged item, wrong item received, supplier error"
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
                  <Link to="/purchase-module/purchase-return" className="flex-1 sm:flex-none"><Button type="button" variant="outline" className="w-full">Cancel</Button></Link>
                  <Button type="submit" disabled={isSubmitting || !form.formState.isValid || totalRefundAmount <= 0} className="flex-1 sm:flex-none">{isSubmitting ? "Saving..." : "Record Purchase Return"}</Button>
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

export default NewPurchaseReturnPage;