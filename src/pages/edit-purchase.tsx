"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn, generateItemCode } from "@/lib/utils";
import { Item, ItemWithCategory, PurchaseWithItems, Supplier } from "@/types";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectItem } from "@/components/ui/select";
import { Autocomplete } from "@/components/autocomplete";
import { EntityAutocomplete } from "@/components/entity-autocomplete";
import { Label } from "@/components/ui/label";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { Calendar as CalendarIcon, Plus, PlusCircle, Trash2, Pencil, Printer, ScanBarcode } from "lucide-react";
import { AddNewItemInlineDialog } from "@/components/add-new-item-inline-dialog";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseInvoice } from "@/components/purchase-invoice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const purchaseFormSchema = z.object({
  SupplierName: z.string().min(2, { message: "Supplier name is required." }),
  supplierMobileNo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Please enter a valid mobile number (10-15 digits, optional + prefix).",
    }),
  PurchaseDate: z.date(),
  AdditionalCost: z.coerce.number().optional().nullable(),
  PaymentType: z.enum(['Cash', 'Bank', 'Credit', 'Mixed'], { required_error: "Payment type is required." }),
  PaymentMode: z.string().optional().nullable(),
  CashAmount: z.coerce.number().optional().nullable(),
  BankAmount: z.coerce.number().optional().nullable(),
  CreditAmount: z.coerce.number().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.PaymentType === 'Mixed') {
    const cash = data.CashAmount ?? 0;
    const bank = data.BankAmount ?? 0;
    const credit = data.CreditAmount ?? 0;
    const totalPaid = cash + bank + credit;
    // The grand total is calculated based on itemsTotalRaw + AdditionalCost
    // We need to pass this from the component state or re-calculate it here.
    // This will be handled in onSubmit for dynamic calculation.
  }
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseListItem {
  ItemId: number;
  ItemName: string;
  CategoryName?: string;
  Barcode?: string | null;
  ItemCode?: string | null;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  TotalPrice: number;
}

const UNITS = ["Piece", "Pack", "Box", "Dozen", "Ream", "Kg", "Gram", "Liter", "ml"];
const EMPTY_ITEM: Omit<PurchaseListItem, 'ItemId'> & { ItemId: number | string } = { ItemId: "", ItemName: "", CategoryName: "", Barcode: "", ItemCode: "", Qty: 1, Unit: "Piece", UnitPrice: 0, TotalPrice: 0 };

function EditPurchasePage() {
  const { purchaseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<PurchaseWithItems | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState<ItemWithCategory[]>([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const [currentItem, setCurrentItem] = useState(EMPTY_ITEM);
  const [addedItems, setAddedItems] = useState<PurchaseListItem[]>([]);
  
  const [isCreateItemOpen, setCreateItemOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUpdateSellPriceDialogOpen, setIsUpdateSellPriceDialogOpen] = useState(false);
  const [itemToUpdateSellPrice, setItemToUpdateSellPrice] = useState<PurchaseListItem | null>(null);
  const [newSellPrice, setNewSellPrice] = useState<number | string>("");
  const [existingSellPriceForDialog, setExistingSellPriceForDialog] = useState<number | null>(null);


  const itemInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    mode: "onChange",
  });

  const watchedAdditionalCost = form.watch("AdditionalCost");
  const watchedPaymentType = form.watch("PaymentType");
  const watchedCashAmount = form.watch("CashAmount");
  const watchedBankAmount = form.watch("BankAmount");
  const watchedCreditAmount = form.watch("CreditAmount");
  const { formState: { isValid } } = form;

  const itemsTotalRaw = addedItems.reduce((sum, item) => sum + item.TotalPrice, 0);
  const numericAdditionalCost = Number(watchedAdditionalCost || 0);
  
  const displayItemsTotal = parseFloat(itemsTotalRaw.toFixed(2));
  const displayGrandTotal = parseFloat((itemsTotalRaw + numericAdditionalCost).toFixed(2));

  const fetchData = useCallback(async () => {
    if (!purchaseId) return;
    
    const { data, error } = await supabase
      .from("Purchase")
      .select("*, PurchaseItem(*, ItemMaster(*, CategoryMaster(*))), SupplierMaster(SupplierName, MobileNo)")
      .eq("PurchaseId", purchaseId)
      .single();

    if (error || !data) {
      toast.error("Failed to fetch purchase details.");
      navigate("/purchase-module/purchase-invoice");
      return;
    }

    const typedPurchase = data as PurchaseWithItems;
    setPurchaseData(typedPurchase);
    form.reset({
      SupplierName: typedPurchase.SupplierMaster?.SupplierName || "",
      supplierMobileNo: typedPurchase.SupplierMaster?.MobileNo || "",
      PurchaseDate: parseISO(typedPurchase.PurchaseDate),
      AdditionalCost: typedPurchase.AdditionalCost || 0,
      PaymentType: typedPurchase.PaymentType || 'Cash',
      PaymentMode: typedPurchase.PaymentMode || '',
      CashAmount: typedPurchase.CashAmount || 0,
      BankAmount: typedPurchase.BankAmount || 0,
      CreditAmount: typedPurchase.CreditAmount || 0,
    });
    if (typedPurchase.SupplierMaster) {
      setSelectedSupplier(typedPurchase.SupplierMaster);
    }

    const loadedItems = typedPurchase.PurchaseItem.map(item => ({
      ItemId: item.ItemId,
      ItemName: item.ItemMaster?.ItemName ?? "Unknown Item",
      CategoryName: item.ItemMaster?.CategoryMaster?.CategoryName,
      Barcode: item.ItemMaster?.Barcode,
      ItemCode: item.ItemMaster?.ItemCode,
      Qty: item.Qty,
      Unit: item.Unit,
      UnitPrice: item.UnitPrice,
      TotalPrice: item.Qty * item.UnitPrice,
    }));
    setAddedItems(loadedItems);

    const { data: itemsData } = await supabase.from("ItemMaster").select("*, CategoryMaster(*)")
    .order("ItemName");
    if (itemsData) setItemSuggestions(itemsData as ItemWithCategory[]);

    const { data: suppliersData, error: suppliersError } = await supabase.from("SupplierMaster").select("SupplierId, SupplierName, MobileNo");
    if (suppliersError) toast.error("Failed to fetch suppliers", { description: suppliersError.message });
    else setSupplierSuggestions(suppliersData || []);
    
    setLoading(false);
  }, [purchaseId, navigate, form]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effect to update mobile number when supplier is selected from autocomplete
  useEffect(() => {
    const currentMobileNo = form.getValues("supplierMobileNo");
    if (selectedSupplier) {
      const newMobileNo = selectedSupplier.MobileNo || "";
      if (currentMobileNo !== newMobileNo) {
        form.setValue("supplierMobileNo", newMobileNo, { shouldValidate: true });
      }
    } else {
      if (!form.formState.dirtyFields.supplierMobileNo && currentMobileNo !== "") {
        form.setValue("supplierMobileNo", "", { shouldValidate: true });
      }
    }
  }, [selectedSupplier, form]);

  // Effect to clear selectedSupplier if SupplierName input changes and no longer matches
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "SupplierName") {
        const currentSupplierName = value.SupplierName;
        if (selectedSupplier && currentSupplierName?.toLowerCase() !== selectedSupplier.SupplierName.toLowerCase()) {
          setSelectedSupplier(null);
        } else if (!currentSupplierName) {
          setSelectedSupplier(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, selectedSupplier]);

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    form.setValue("SupplierName", supplier.SupplierName, { shouldValidate: true });
  };

  const handleSupplierNameChange = (name: string) => {
    form.setValue("SupplierName", name, { shouldValidate: true });
  };

  const handleCurrentItemChange = (field: keyof typeof currentItem, value: string | number) => {
    const updatedItem = { ...currentItem, [field]: value };
    if (field === "ItemName") {
      const selected = itemSuggestions.find(i => (i.ItemName ?? '').toLowerCase() === String(value).toLowerCase());
      updatedItem.ItemId = selected ? selected.ItemId : "";
      updatedItem.CategoryName = selected ? selected.CategoryMaster?.CategoryName : "";
      updatedItem.Barcode = selected ? selected.Barcode : "";
      updatedItem.ItemCode = selected ? selected.ItemCode : "";
    }
    if (field === "Qty" || field === "UnitPrice") {
      const qty = field === "Qty" ? Number(value) : updatedItem.Qty;
      const price = field === "UnitPrice" ? Number(value) : updatedItem.UnitPrice;
      updatedItem.TotalPrice = parseFloat((qty * price).toFixed(2));
    }
    if (field === "TotalPrice") {
      const total = Number(value);
      if (updatedItem.Qty > 0) {
        updatedItem.UnitPrice = parseFloat((total / updatedItem.Qty).toFixed(2));
      }
    }
    setCurrentItem(updatedItem);
  };

  const handleItemSelect = (selectedItem: ItemWithCategory) => {
    setCurrentItem({ 
      ...EMPTY_ITEM, 
      ItemId: selectedItem.ItemId, 
      ItemName: selectedItem.ItemName ?? '',
      CategoryName: selectedItem.CategoryMaster?.CategoryName,
      Barcode: selectedItem.Barcode,
      ItemCode: selectedItem.ItemCode,
      Qty: 1,
      Unit: "Piece",
      UnitPrice: 0,
      TotalPrice: 0,
    });
    qtyInputRef.current?.focus();
  };

  const handleAddItem = () => {
    if (!currentItem.ItemId || typeof currentItem.ItemId !== 'number') return toast.error("Please select a valid item.");
    if (currentItem.Qty <= 0) return toast.error("Quantity must be greater than zero.");
    if (currentItem.UnitPrice <= 0) {
      toast.error("Unit price must be greater than zero.");
      return;
    }
    
    const existingItemIndex = addedItems.findIndex(
      (item) =>
        item.ItemId === currentItem.ItemId &&
        item.Unit === currentItem.Unit &&
        item.UnitPrice === currentItem.UnitPrice
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...addedItems];
      const existingItem = updatedItems[existingItemIndex];
      existingItem.Qty += currentItem.Qty;
      existingItem.TotalPrice = parseFloat((existingItem.Qty * existingItem.UnitPrice).toFixed(2));
      setAddedItems(updatedItems);
      toast.success(`Quantity for "${currentItem.ItemName}" updated.`);
    } else {
      setAddedItems([...addedItems, currentItem as PurchaseListItem]);
      toast.success(`Item "${currentItem.ItemName}" added.`);
    }

    setCurrentItem(EMPTY_ITEM);
    itemInputRef.current?.focus();
  };

  const handleEditItem = (index: number) => {
    const itemToEdit = addedItems[index];
    const newAddedItems = addedItems.filter((_, i) => i !== index);
    setAddedItems(newAddedItems);
    setCurrentItem(itemToEdit);
    itemInputRef.current?.focus();
  };

  const handleItemCreated = (newItem: Item) => {
    const newSuggestion = { ...newItem, CategoryMaster: null };
    setItemSuggestions([...itemSuggestions, newSuggestion]);
    setCurrentItem({ 
      ...EMPTY_ITEM, 
      ItemId: newItem.ItemId, 
      ItemName: newItem.ItemName ?? '',
      Barcode: newItem.Barcode, 
      ItemCode: newItem.ItemCode,
      Qty: 1,
      Unit: "Piece",
      UnitPrice: 0,
      TotalPrice: 0,
    });
    qtyInputRef.current?.focus();
  };

  const handleScan = (barcode: string) => {
    const foundItem = itemSuggestions.find(item => item.Barcode === barcode);
    if (foundItem) {
      handleItemSelect(foundItem);
      toast.success(`Found item: ${foundItem.ItemName}`);
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    } else {
      toast.error("Item not found", { description: "No item in your master list matches this barcode." });
    }
    setIsScannerOpen(false);
  };

  const handleUpdateSellPriceClick = (item: PurchaseListItem) => {
    setItemToUpdateSellPrice(item);
    setIsUpdateSellPriceDialogOpen(true);
  };

  useEffect(() => {
    if (isUpdateSellPriceDialogOpen && itemToUpdateSellPrice) {
      const fetchItemSellPrice = async () => {
        const { data, error } = await supabase
          .from("ItemMaster")
          .select("SellPrice")
          .eq("ItemId", itemToUpdateSellPrice.ItemId)
          .single();

        if (error) {
          toast.error("Failed to fetch item sell price", { description: error.message });
          setExistingSellPriceForDialog(null);
          setNewSellPrice("");
        } else if (data) {
          setExistingSellPriceForDialog(data.SellPrice);
          setNewSellPrice(data.SellPrice || "");
        } else {
          setExistingSellPriceForDialog(null);
          setNewSellPrice("");
        }
      };
      fetchItemSellPrice();
    }
  }, [isUpdateSellPriceDialogOpen, itemToUpdateSellPrice]);

  const handleConfirmUpdateSellPrice = async () => {
    if (!itemToUpdateSellPrice || typeof newSellPrice !== 'number' || isNaN(newSellPrice) || newSellPrice < 0) {
      toast.error("Invalid sell price.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from("ItemMaster")
      .update({ SellPrice: newSellPrice })
      .eq("ItemId", itemToUpdateSellPrice.ItemId);
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update sell price", { description: error.message });
    } else {
      toast.success(`Sell price for "${itemToUpdateSellPrice.ItemName}" updated to ${formatCurrency(newSellPrice)}!`);
      const { data: itemsData, error: itemsError } = await supabase
        .from("ItemMaster").select("*, CategoryMaster(*)")
        .order("ItemName");
      if (!itemsError) setItemSuggestions(itemsData as ItemWithCategory[]);
      setIsUpdateSellPriceDialogOpen(false);
      setItemToUpdateSellPrice(null);
      setNewSellPrice("");
      setExistingSellPriceForDialog(null);
    }
  };

  const isCurrentItemNew = currentItem.ItemName && !itemSuggestions.some(i => (i.ItemName ?? '').toLowerCase() === (currentItem.ItemName ?? '').toLowerCase());

  const savePurchase = async (values: PurchaseFormValues): Promise<boolean> => {
    if (!purchaseId) {
      toast.error("Purchase ID is missing.");
      return false;
    }
    if (addedItems.length === 0) {
      toast.error("Please add at least one item.");
      return false;
    }
    
    setIsSubmitting(true);

    let finalSupplierId: number | null = null;
    let supplierToUpdate: Supplier | null = null;

    const existingSupplier = supplierSuggestions.find(s => s.SupplierName.toLowerCase() === values.SupplierName.toLowerCase());

    if (existingSupplier) {
      finalSupplierId = existingSupplier.SupplierId;
      supplierToUpdate = existingSupplier;
    } else {
      const { data: newSupplier, error: createSupplierError } = await supabase
        .from("SupplierMaster")
        .insert([{ SupplierName: values.SupplierName, MobileNo: values.supplierMobileNo || null }])
        .select()
        .single();

      if (createSupplierError || !newSupplier) {
        toast.error("Failed to create new supplier", { description: createSupplierError?.message });
        setIsSubmitting(false);
        return false;
      }
      finalSupplierId = newSupplier.SupplierId;
      supplierToUpdate = newSupplier;
      toast.success(`New supplier "${newSupplier.SupplierName}" added.`);
    }

    if (supplierToUpdate && supplierToUpdate.SupplierId && supplierToUpdate.MobileNo !== values.supplierMobileNo) {
      const { error: updateMobileError } = await supabase
        .from("SupplierMaster")
        .update({ MobileNo: values.supplierMobileNo || null })
        .eq("SupplierId", supplierToUpdate.SupplierId);
      if (updateMobileError) {
        toast.error("Failed to update supplier mobile number", { description: updateMobileError.message });
        setIsSubmitting(false);
        return false;
      }
    }
    
    const itemsTotalSum = itemsTotalRaw;
    const additionalCost = values.AdditionalCost || 0;
    const invoiceNetTotal = itemsTotalSum + additionalCost;

    let cashAmount = values.CashAmount ?? 0;
    let bankAmount = values.BankAmount ?? 0;
    let creditAmount = values.CreditAmount ?? 0;

    if (values.PaymentType === 'Cash') {
      cashAmount = invoiceNetTotal;
      bankAmount = 0;
      creditAmount = 0;
    } else if (values.PaymentType === 'Bank') {
      cashAmount = 0;
      bankAmount = invoiceNetTotal;
      creditAmount = 0;
    } else if (values.PaymentType === 'Credit') {
      cashAmount = 0;
      bankAmount = 0;
      creditAmount = invoiceNetTotal;
    } else if (values.PaymentType === 'Mixed') {
      const totalSplit = cashAmount + bankAmount + creditAmount;
      if (Math.abs(totalSplit - invoiceNetTotal) > 0.01) { // Allow for floating point inaccuracies
        toast.error("Payment split does not match invoice total.", {
          description: `Total split: ${formatCurrency(totalSplit)}, Invoice Total: ${formatCurrency(invoiceNetTotal)}`,
        });
        setIsSubmitting(false);
        return false;
      }
    }

    const { error: purchaseError } = await supabase
      .from("Purchase").update({ 
        SupplierId: finalSupplierId,
        PurchaseDate: values.PurchaseDate.toISOString(),
        TotalAmount: invoiceNetTotal,
        AdditionalCost: additionalCost,
        PaymentType: values.PaymentType,
        PaymentMode: values.PaymentMode === '' ? null : values.PaymentMode,
        CashAmount: cashAmount,
        BankAmount: bankAmount,
        CreditAmount: creditAmount,
      }).eq("PurchaseId", purchaseId);

    if (purchaseError) {
      toast.error("Failed to update purchase", { description: purchaseError.message });
      setIsSubmitting(false);
      return false;
    }

    const { error: deleteError } = await supabase.from("PurchaseItem").delete().eq("PurchaseId", purchaseId);
    if (deleteError) {
      toast.error("Failed to update purchase items. Please try again.", { description: deleteError.message });
      setIsSubmitting(false);
      return false;
    }

    const purchaseItems = addedItems.map(item => ({
      PurchaseId: Number(purchaseId),
      ItemId: item.ItemId,
      Qty: item.Qty,
      Unit: item.Unit,
      UnitPrice: item.UnitPrice,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("PurchaseItem")
      .insert(purchaseItems)
      .select();

    if (itemsError || !insertedItems || insertedItems.length !== purchaseItems.length) {
      toast.error("Failed to save updated items.", { 
        description: itemsError?.message || "An unknown error occurred. The changes were not saved."
      });
      setIsSubmitting(false);
      return false;
    }

    // Update Payable entry if there's a credit portion
    if (creditAmount > 0 && finalSupplierId) {
      const { data: existingPayable, error: fetchPayableError } = await supabase
        .from("Payables")
        .select("PayableId")
        .eq("PurchaseId", purchaseId)
        .single();

      if (fetchPayableError && fetchPayableError.code !== 'PGRST116') { // PGRST116 means no rows found
        toast.error("Failed to check existing payable", { description: fetchPayableError.message });
        console.error("Payable fetch error:", fetchPayableError);
      } else if (existingPayable) {
        // Update existing payable
        const { error: updatePayableError } = await supabase.from("Payables").update({
          Amount: creditAmount,
          Balance: creditAmount, // Assuming full credit amount is outstanding on update
          Status: 'Outstanding',
        }).eq("PayableId", existingPayable.PayableId);
        if (updatePayableError) {
          toast.error("Failed to update payable entry", { description: updatePayableError.message });
          console.error("Payable update error:", updatePayableError);
        }
      } else {
        // Create new payable
        const { error: createPayableError } = await supabase.from("Payables").insert({
          PurchaseId: Number(purchaseId),
          SupplierId: finalSupplierId,
          Amount: creditAmount,
          Balance: creditAmount,
          Status: 'Outstanding',
        });
        if (createPayableError) {
          toast.error("Failed to create payable entry", { description: createPayableError.message });
          console.error("Payable creation error:", createPayableError);
        }
      }
    } else if (creditAmount === 0 && finalSupplierId) {
      // If credit amount is 0, delete any existing payable for this purchase
      const { error: deletePayableError } = await supabase
        .from("Payables")
        .delete()
        .eq("PurchaseId", purchaseId);
      if (deletePayableError && deletePayableError.code !== 'PGRST116') { // Ignore if no payable found
        toast.error("Failed to delete payable entry", { description: deletePayableError.message });
        console.error("Payable deletion error:", deletePayableError);
      }
    }

    toast.success(`Purchase updated successfully!`);
    setIsSubmitting(false);
    return true;
  }

  const handleFormSubmit = async (values: PurchaseFormValues) => {
    const success = await savePurchase(values);
    if (success) {
      navigate("/purchase-module/purchase-invoice");
    }
  };

  const handlePrint = async () => {
    if (!purchaseId) {
      toast.error("Purchase ID is missing.");
      return;
    }
    
    setIsSubmitting(true);

    const isValidForm = await form.trigger();
    if (!isValidForm) {
      toast.error("Please correct the errors in the form before printing.");
      setIsSubmitting(false);
      return;
    }

    const saveSuccess = await savePurchase(form.getValues());

    if (saveSuccess) {
      await fetchData();

      setTimeout(() => {
        window.print();
      }, 100); 
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  const invoiceDataForPrint = purchaseData;

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="print-only">
        <PurchaseInvoice purchase={invoiceDataForPrint} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Purchase</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handlePrint} disabled={isSubmitting || loading || !purchaseData}>
                <span className="flex items-center">
                  <Printer className="mr-2 h-4 w-4" />
                  <span>Print</span>
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print Invoice (Ctrl+P)</p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="SupplierName"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <EntityAutocomplete<Supplier>
                          id="supplier-name"
                          label="Supplier Name"
                          suggestions={supplierSuggestions}
                          value={field.value}
                          onValueChange={handleSupplierNameChange}
                          onSelect={handleSupplierSelect}
                          getId={(s) => s.SupplierId}
                          getName={(s) => s.SupplierName}
                          getMobileNo={(s) => s.MobileNo}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="PurchaseDate" render={({ field }) => (
                  <FormItem>
                    <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                      <div className="relative">
                        <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Purchase Date</Label>
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
                <FormItem>
                  <FormControl>
                    <FloatingLabelInput 
                      id="ReferenceNo" 
                      label="Reference No" 
                      value={purchaseData?.ReferenceNo || ""} 
                      readOnly 
                      className="bg-muted/50"
                    />
                  </FormControl>
                </FormItem>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierMobileNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelInput id="supplierMobileNo" label="Supplier Mobile No. (Optional)" type="tel" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="AdditionalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelInput id="AdditionalCost" label="Additional Cost" type="number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Payment Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="PaymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingLabelSelect
                          label="Payment Type"
                          value={field.value}
                          onValueChange={field.onChange}
                          id="payment-type-select"
                        >
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Credit">Credit</SelectItem>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                        </FloatingLabelSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(watchedPaymentType === 'Bank' || watchedPaymentType === 'Mixed') && (
                  <FormField
                    control={form.control}
                    name="PaymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingLabelInput id="payment-mode" label="Payment Mode (UPI/Transfer/Cheque)" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {watchedPaymentType === 'Mixed' && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <h3 className="font-semibold text-lg">Payment Split Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="CashAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput id="cash-amount" label="Cash Amount" type="number" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="BankAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput id="bank-amount" label="Bank Amount" type="number" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="CreditAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput id="credit-amount" label="Credit Amount" type="number" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span>Total Split: {formatCurrency((watchedCashAmount ?? 0) + (watchedBankAmount ?? 0) + (watchedCreditAmount ?? 0))}</span>
                    <span>Invoice Total: {formatCurrency(displayGrandTotal)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add Items</Label>
                  <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                    <span className="flex items-center">
                      <ScanBarcode className="mr-2 h-4 w-4" />
                      <span>Scan Item</span>
                    </span>
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg">
                  <div className="flex-1 min-w-[80px]"><FloatingLabelInput value={currentItem.ItemCode || (typeof currentItem.ItemId === 'number' ? generateItemCode(currentItem.CategoryName, currentItem.ItemId) : "")} label="Code" id="current_item_code" readOnly className="bg-muted/50 font-mono text-xs" /></div>
                  <div className="relative flex-1 min-w-[250px]">
                    <Autocomplete<ItemWithCategory> ref={itemInputRef} suggestions={itemSuggestions} value={currentItem.ItemName} onValueChange={(v: string) => handleCurrentItemChange("ItemName", v)} onSelect={handleItemSelect} label="Item Name" id="current_item" className={cn(isCurrentItemNew && "pr-24")} 
                      getId={(item) => item.ItemId}
                      getName={(item) => item.ItemName || ''}
                      getItemCode={(item) => item.ItemCode}
                    />
                    {isCurrentItemNew && <Button type="button" size="sm" onClick={() => setCreateItemOpen(true)} className="absolute right-1 top-1/2 -translate-y-1/2 h-8" aria-label="Create new item">
                      <span className="flex items-center">
                        <PlusCircle className="mr-1 h-4 w-4" />
                        <span>Create</span>
                      </span>
                    </Button>}
                  </div>
                  <div className="flex-1 min-w-[150px]"><FloatingLabelInput value={currentItem.Barcode || ""} label="Barcode" id="current_item_barcode" readOnly className="bg-muted/50 font-mono text-xs" /></div>
                  <div className="flex-1 min-w-[90px]"><FloatingLabelSelect label="Unit" value={currentItem.Unit} onValueChange={(v) => handleCurrentItemChange("Unit", v)} id="current_unit_select">{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</FloatingLabelSelect></div>
                  <div className="flex-1 min-w-[70px]"><FloatingLabelInput ref={qtyInputRef} type="number" value={currentItem.Qty} onChange={(e) => handleCurrentItemChange("Qty", e.target.valueAsNumber)} label="Qty" id="current_qty" /></div>
                  <div className="flex-1 min-w-[90px] relative">
                    <FloatingLabelInput type="number" value={currentItem.UnitPrice} onChange={(e) => handleCurrentItemChange("UnitPrice", e.target.valueAsNumber)} label="Unit Price" id="current_unit_price" className="pr-10" />
                    {typeof currentItem.ItemId === 'number' && currentItem.ItemId !== 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => handleUpdateSellPriceClick(currentItem as PurchaseListItem)}
                            title="Update Item Sell Price"
                            aria-label="Update item sell price"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Update Item Sell Price</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex-1 min-w-[90px]"><FloatingLabelInput type="number" value={currentItem.TotalPrice} onChange={(e) => handleCurrentItemChange("TotalPrice", e.target.valueAsNumber)} label="Total" id="current_total" /></div>
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" onClick={handleAddItem} className="self-center h-10 w-full" aria-label="Add item">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add Item</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {addedItems.length > 0 && (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {addedItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.ItemName}</TableCell>
                          <TableCell className="text-right">{item.Qty}</TableCell>
                          <TableCell>{item.Unit}</TableCell>
                          <TableCell className="text-right">{item.UnitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.TotalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => handleEditItem(index)} aria-label="Edit item">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit Item (Ctrl+E)</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => { const newItems = [...addedItems]; newItems.splice(index, 1); setAddedItems(newItems); }} aria-label="Delete item">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete Item (Ctrl+D)</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4 pt-4">
                <div className="flex space-x-2 w-full sm:w-auto">
                  <Link to="/purchase-module/purchase-invoice" className="flex-1 sm:flex-none">
                    <Button type="button" variant="outline" className="w-full">Cancel</Button>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="submit" disabled={isSubmitting || !isValid || addedItems.length === 0} className="flex-1 sm:flex-none">
                        {isSubmitting ? "Saving..." : "Save Purchase"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save Purchase (Ctrl+S)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="w-full sm:w-auto sm:max-w-xs space-y-1 text-sm self-end">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Items Total</span>
                        <span>{formatCurrency(displayItemsTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Additional Cost</span>
                        <span>{formatCurrency(watchedAdditionalCost || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base">
                        <span>Grand Total</span>
                        <span>{formatCurrency(displayGrandTotal)}</span>
                    </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <AddNewItemInlineDialog open={isCreateItemOpen} onOpenChange={setCreateItemOpen} initialItemName={currentItem.ItemName} onItemAdded={handleItemCreated} />
      <BarcodeScannerDialog open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScan} />

      <AlertDialog open={isUpdateSellPriceDialogOpen} onOpenChange={setIsUpdateSellPriceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Sell Price for "{itemToUpdateSellPrice?.ItemName}"</AlertDialogTitle>
            <AlertDialogDescription>
              Current Sell Price: <span className="font-semibold">INR {formatCurrency(existingSellPriceForDialog || 0)}</span>.
              Enter the new selling price for this item in your master list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <FloatingLabelInput
              id="newSellPrice"
              label="New Sell Price"
              type="number"
              value={newSellPrice}
              onChange={(e) => setNewSellPrice(e.target.valueAsNumber)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setItemToUpdateSellPrice(null); setNewSellPrice(""); setExistingSellPriceForDialog(null); }}>Cancel</AlertDialogCancel>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogAction onClick={handleConfirmUpdateSellPrice} disabled={isSubmitting || typeof newSellPrice !== 'number' || isNaN(newSellPrice) || newSellPrice < 0}>
                  {isSubmitting ? "Updating..." : "Update Price"}
                </AlertDialogAction>
              </TooltipTrigger>
              <TooltipContent>
                <p>Update Price (Ctrl+S)</p>
              </TooltipContent>
            </Tooltip>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NewPurchasePage;