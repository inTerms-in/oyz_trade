"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn, generateItemCode } from "@/lib/utils";
import { Item, ItemWithCategory, SaleWithItems, Customer, ShopDetails } from "@/types";

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
import { Calendar as CalendarIcon, Plus, PlusCircle, Trash2, Pencil, ScanBarcode, Printer } from "lucide-react";
import { AddNewItemInlineDialog } from "@/components/add-new-item-inline-dialog";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SaleInvoice } from "@/components/sale-invoice";
import { SalePostSaveActionsDialog } from "@/components/sale-post-save-actions-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const saleFormSchema = z.object({
  CustomerName: z.string().optional().nullable(),
  customerMobileNo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || new RegExp('^\\+?[0-9]{5,15}$').test(val), {
      message: "Please enter a valid mobile number (5-15 digits, optional + prefix).",
    }),
  SaleDate: z.date(),
  AdditionalDiscount: z.coerce.number().optional().nullable(),
  DiscountPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  PaymentType: z.enum(['Cash', 'Bank', 'Credit', 'Mixed'], { required_error: "Payment type is required." }),
  PaymentMode: z.string().optional().nullable(),
  CashAmount: z.coerce.number().optional().nullable(),
  BankAmount: z.coerce.number().optional().nullable(),
  CreditAmount: z.coerce.number().optional().nullable(),
}).superRefine((data, _ctx) => {
  if (data.PaymentType === 'Mixed') {
    // The grand total is calculated based on itemsTotal - AdditionalDiscount
    // This will be handled in onSubmit for dynamic calculation.
  }
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SaleListItem {
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
const EMPTY_ITEM: Omit<SaleListItem, 'ItemId'> & { ItemId: number | string } = { ItemId: "", ItemName: "", CategoryName: "", Barcode: "", ItemCode: "", Qty: 1, Unit: "Piece", UnitPrice: 0, TotalPrice: 0 };

// Fixed ID for the single shop entry
const SINGLE_SHOP_ID = '00000000-0000-0000-0000-000000000001';

export default function EditSalePage() {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saleData, setSaleData] = useState<SaleWithItems | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState<ItemWithCategory[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  
  const [currentItem, setCurrentItem] = useState(EMPTY_ITEM);
  const [addedItems, setAddedItems] = useState<SaleListItem[]>([]);
  
  const [isCreateItemOpen, setCreateItemOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastDiscountChangeSource, setLastDiscountChangeSource] = useState<'amount' | 'percentage' | null>(null);
  const [isPostSaveActionsDialogOpen, setIsPostSaveActionsDialogOpen] = useState(false);
  const isActionFromNew = useRef(location.state?.actionFromNew || false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false); // New state for WhatsApp button
  const [hasHandledInitialAction, setHasHandledInitialAction] = useState(false); // New state to prevent re-triggering initial action

  const itemInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const saleDataRef = useRef<SaleWithItems | null>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    mode: "onChange",
  });

  const watchedAdditionalDiscount = form.watch("AdditionalDiscount");
  const watchedDiscountPercentage = form.watch("DiscountPercentage");
  const watchedPaymentType = form.watch("PaymentType");
  const watchedCashAmount = form.watch("CashAmount");
  const watchedBankAmount = form.watch("BankAmount");
  const watchedCreditAmount = form.watch("CreditAmount");
  const { formState: { isValid } = {} } = form;

  const itemsTotal = addedItems.reduce((sum: number, item: SaleListItem) => sum + item.TotalPrice, 0);
  const grandTotal = itemsTotal - (watchedAdditionalDiscount || 0);

  // Synchronize AdditionalDiscount and DiscountPercentage
  useEffect(() => {
    const currentAdditionalDiscount = form.getValues("AdditionalDiscount") ?? 0;
    const currentDiscountPercentage = form.getValues("DiscountPercentage") ?? 0;

    if (itemsTotal === 0) {
      if (currentAdditionalDiscount !== 0) {
        form.setValue("AdditionalDiscount", 0, { shouldValidate: true });
      }
      if (currentDiscountPercentage !== 0) {
        form.setValue("DiscountPercentage", 0, { shouldValidate: true });
      }
      return;
    }

    if (lastDiscountChangeSource === 'amount') {
      const discount = watchedAdditionalDiscount ?? 0;
      const calculatedPercentage = (discount / itemsTotal) * 100;
      const newPercentage = parseFloat(calculatedPercentage.toFixed(2));
      if (currentDiscountPercentage !== newPercentage) {
        form.setValue("DiscountPercentage", newPercentage, { shouldValidate: true });
      }
      setLastDiscountChangeSource(null);
    } else if (lastDiscountChangeSource === 'percentage') {
      const percentage = watchedDiscountPercentage ?? 0;
      const calculatedDiscount = (percentage / 100) * itemsTotal;
      const newDiscount = parseFloat(calculatedDiscount.toFixed(2));
      if (currentAdditionalDiscount !== newDiscount) {
        form.setValue("AdditionalDiscount", newDiscount, { shouldValidate: true });
      }
      setLastDiscountChangeSource(null);
    }
  }, [watchedAdditionalDiscount, watchedDiscountPercentage, itemsTotal, form, lastDiscountChangeSource]);

  const fetchData = useCallback(async () => {
    if (!saleId) return;
    
    const { data, error } = await supabase
      .from("Sales")
      .select("*, SalesItem(*, ItemMaster(*, CategoryMaster(*))), CustomerMaster(CustomerName, MobileNo)")
      .eq("SaleId", saleId)
      .single();

    if (error || !data) {
      toast.error("Failed to fetch sale details.");
      navigate("/sales");
      return;
    }

    const typedSale = data as SaleWithItems;
    setSaleData(typedSale);
    saleDataRef.current = typedSale;
    form.reset({
      CustomerName: typedSale.CustomerMaster?.CustomerName || "",
      customerMobileNo: typedSale.CustomerMaster?.MobileNo || "",
      SaleDate: parseISO(typedSale.SaleDate),
      AdditionalDiscount: typedSale.AdditionalDiscount || 0,
      DiscountPercentage: typedSale.DiscountPercentage || 0,
      PaymentType: typedSale.PaymentType || 'Cash',
      PaymentMode: typedSale.PaymentMode || '',
      CashAmount: typedSale.CashAmount || 0,
      BankAmount: typedSale.BankAmount || 0,
      CreditAmount: typedSale.CreditAmount || 0,
    });
    if (typedSale.CustomerMaster) {
      setSelectedCustomer(typedSale.CustomerMaster);
    }

    const loadedItems = typedSale.SalesItem.map(item => ({
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

    const { data: customersData, error: customersError } = await supabase.from("CustomerMaster").select("CustomerId, CustomerName, MobileNo");
    if (customersError) toast.error("Failed to fetch customers", { description: customersError.message });
    else setCustomerSuggestions(customersData || []);

    const { data: shopData, error: shopError } = await supabase
      .from("shop")
      .select("shop_name, mobile_no, address")
      .eq("id", SINGLE_SHOP_ID) // Fetch by fixed ID
      .single();

    if (shopError && shopError.code !== 'PGRST116') {
      toast.error("Failed to fetch shop details", { description: shopError.message });
    } else if (shopData) {
      setShopDetails(shopData);
    }
    
    setLoading(false);
  }, [saleId, navigate, form]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  const saveSale = useCallback(async (values: SaleFormValues): Promise<boolean> => {
    if (!saleId) {
      toast.error("Sale ID is missing.");
      return false;
    }
    if (addedItems.length === 0) {
      toast.error("Please add at least one item.");
      return false;
    }
    
    setIsSubmitting(true);

    let finalCustomerId: number | null = null;
    let customerToUpdate: Customer | null = null;

    if (values.CustomerName) {
      const existingCustomer = customerSuggestions.find(c => c.CustomerName.toLowerCase() === values.CustomerName!.toLowerCase());

      if (existingCustomer) {
        finalCustomerId = existingCustomer.CustomerId;
        customerToUpdate = existingCustomer;
      } else {
        const { data: newCustomer, error: createCustomerError } = await supabase
          .from("CustomerMaster")
          .insert([{ CustomerName: values.CustomerName, MobileNo: values.customerMobileNo || null }])
          .select()
          .single();

        if (createCustomerError || !newCustomer) {
          toast.error("Failed to create new customer", { description: createCustomerError?.message });
          setIsSubmitting(false);
          return false;
        }
        finalCustomerId = newCustomer.CustomerId;
        customerToUpdate = newCustomer;
        toast.success(`New customer "${newCustomer.CustomerName}" added.`);
      }

      if (customerToUpdate && customerToUpdate.CustomerId && customerToUpdate.MobileNo !== values.customerMobileNo) {
        const { error: updateMobileError } = await supabase
          .from("CustomerMaster")
          .update({ MobileNo: values.customerMobileNo || null })
          .eq("CustomerId", customerToUpdate.CustomerId);
        if (updateMobileError) {
          toast.error("Failed to update customer mobile number", { description: updateMobileError.message });
          setIsSubmitting(false);
          return false;
        }
      }
    }
    
    const additionalDiscount = values.AdditionalDiscount || 0;
    const discountPercentage = values.DiscountPercentage || 0;
    const invoiceNetTotal = itemsTotal - additionalDiscount;

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

    const { error: saleError } = await supabase
      .from("Sales").update({ 
        CustomerId: finalCustomerId,
        SaleDate: values.SaleDate.toISOString(),
        TotalAmount: invoiceNetTotal,
        AdditionalDiscount: additionalDiscount,
        DiscountPercentage: discountPercentage,
        PaymentType: values.PaymentType,
        PaymentMode: values.PaymentMode === '' ? null : values.PaymentMode,
        CashAmount: cashAmount,
        BankAmount: bankAmount,
        CreditAmount: creditAmount,
      }).eq("SaleId", saleId);

    if (saleError) {
      toast.error("Failed to update sale", { description: saleError.message });
      setIsSubmitting(false);
      return false;
    }

    const { error: deleteError } = await supabase.from("SalesItem").delete().eq("SaleId", saleId);
    if (deleteError) {
      toast.error("Failed to update sale items. Please try again.", { description: deleteError.message });
      setIsSubmitting(false);
      return false;
    }

    const saleItems = addedItems.map(item => ({
      SaleId: Number(saleId),
      ItemId: item.ItemId,
      Qty: item.Qty,
      Unit: item.Unit,
      UnitPrice: item.UnitPrice,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("SalesItem")
      .insert(saleItems)
      .select();

    if (itemsError || !insertedItems || insertedItems.length !== saleItems.length) {
      toast.error("Failed to save updated items.", { 
        description: itemsError?.message || "An unknown error occurred. The changes were not saved."
      });
      setIsSubmitting(false);
      return false;
    }

    // Update Receivable entry if there's a credit portion
    if (creditAmount > 0 && finalCustomerId) {
      const { data: existingReceivable, error: fetchReceivableError } = await supabase
        .from("Receivables")
        .select("ReceivableId")
        .eq("SaleId", saleId)
        .single();

      if (fetchReceivableError && fetchReceivableError.code !== 'PGRST116') { // PGRST116 means no rows found
        toast.error("Failed to check existing receivable", { description: fetchReceivableError.message });
        console.error("Receivable fetch error:", fetchReceivableError);
      } else if (existingReceivable) {
        // Update existing receivable
        const { error: updateReceivableError } = await supabase.from("Receivables").update({
          Amount: creditAmount,
          Balance: creditAmount, // Assuming full credit amount is outstanding on update
          Status: 'Outstanding',
        }).eq("ReceivableId", existingReceivable.ReceivableId);
        if (updateReceivableError) {
          toast.error("Failed to update receivable entry", { description: updateReceivableError.message });
          console.error("Receivable update error:", updateReceivableError);
        }
      } else {
        // Create new receivable
        const { error: createReceivableError } = await supabase.from("Receivables").insert({
          SaleId: Number(saleId),
          CustomerId: finalCustomerId,
          Amount: creditAmount,
          Balance: creditAmount,
          Status: 'Outstanding',
        });
        if (createReceivableError) {
          toast.error("Failed to create receivable entry", { description: createReceivableError.message });
          console.error("Receivable creation error:", createReceivableError);
        }
      }
    } else if (creditAmount === 0 && finalCustomerId) {
      // If credit amount is 0, delete any existing receivable for this sale
      const { error: deleteReceivableError } = await supabase
        .from("Receivables")
        .delete()
        .eq("SaleId", saleId);
      if (deleteReceivableError && deleteReceivableError.code !== 'PGRST116') { // Ignore if no receivable found
        toast.error("Failed to delete receivable entry", { description: deleteReceivableError.message });
        console.error("Receivable deletion error:", deleteReceivableError);
      }
    }

    toast.success(`Sale updated successfully!`);
    setIsSubmitting(false);
    return true;
  }, [saleId, addedItems, customerSuggestions, itemsTotal]);

  const handlePrint = useCallback(async (id: number) => {
    if (!id) {
      toast.error("Sale ID is missing for print.");
      return;
    }
    
    setIsSubmitting(true);

    // Only save if the action is not coming from the new sale dialog
    if (!isActionFromNew.current) {
      const isValidForm = await form.trigger();
      if (!isValidForm) {
        toast.error("Please correct the errors in the form before printing.");
        setIsSubmitting(false);
        return;
      }

      const saveSuccess = await saveSale(form.getValues());
      if (!saveSuccess) {
        setIsSubmitting(false);
        return;
      }
    }

    // Re-fetch data to ensure the invoice has the latest saved details
    await fetchData();

    setTimeout(() => {
      window.print();
      // Reset flag after action is completed
      isActionFromNew.current = false; 
      setIsSubmitting(false); // Ensure submitting state is reset after print
    }, 100); 
    
  }, [form, saveSale, fetchData]);

  const handleSendWhatsApp = useCallback(async (id: number) => {
    if (!id) {
      toast.error("Sale ID missing.");
      return;
    }
    if (isSendingWhatsApp) { // Prevent multiple clicks
      return;
    }

    const customerMobileNo = form.getValues("customerMobileNo");
    if (!customerMobileNo) {
      const { data: customerData, error } = await supabase
        .from('CustomerMaster')
        .select('MobileNo')
        .eq('CustomerId', saleData?.CustomerId)
        .single();
      
      if (error || !customerData?.MobileNo) {
        toast.error("Customer mobile number is required to send via WhatsApp.");
        return;
      }
    }

    setIsSubmitting(true);
    setIsSendingWhatsApp(true); // Set state to true
    toast.info("Preparing WhatsApp message...", { description: "This may take a moment." });

    try {
      // Only save if the action is not coming from the new sale dialog
      if (!isActionFromNew.current) {
        await saveSale(form.getValues());
      }
      
      // Re-fetch data to ensure the message has the latest saved details
      await fetchData();

      // Use a temporary variable to ensure the latest data is used
      const currentSaleData = saleDataRef.current;

      if (!currentSaleData) {
        throw new Error("Sale data not available for message generation.");
      }

      const customerName = currentSaleData.CustomerMaster?.CustomerName || 'Walk-in Customer';
      const totalAmount = formatCurrency(currentSaleData.TotalAmount);
      const referenceNo = currentSaleData.ReferenceNo;
      const saleDate = format(parseISO(currentSaleData.SaleDate), "PPP");

      let message = `*Hello ${customerName}! Here is your sales invoice from ${shopDetails?.shop_name || 'PurchaseTracker'}.*\n\n`;
      message += `*Invoice Ref No:* ${referenceNo}\n`;
      message += `*Date:* ${saleDate}\n\n`;
      
      message += `*Items:*\n`;
      currentSaleData.SalesItem.forEach(item => {
        const itemName = item.ItemMaster?.ItemName || 'N/A';
        const itemCode = item.ItemMaster?.ItemCode || generateItemCode(item.ItemMaster?.CategoryMaster?.CategoryName, item.ItemId);
        message += `  • ${itemName} (${itemCode})\n`;
        message += `    Qty: ${item.Qty} ${item.Unit}, Unit Price: ${formatCurrency(item.UnitPrice)}, Total: ${formatCurrency(item.UnitPrice * item.Qty)}\n`;
      });
      message += `\n`;

      const itemsSubtotal = currentSaleData.SalesItem.reduce((sum, item) => sum + (item.UnitPrice * item.Qty), 0);
      message += `*Subtotal:* ${formatCurrency(itemsSubtotal)}\n`;
      if (currentSaleData.AdditionalDiscount && currentSaleData.AdditionalDiscount > 0) {
        message += `*Discount:* -${formatCurrency(currentSaleData.AdditionalDiscount)} ${currentSaleData.DiscountPercentage ? `(${currentSaleData.DiscountPercentage}%)` : ''}\n`;
      }
      message += `*Grand Total:* ${totalAmount}\n\n`;
      
      message += `*Thank you for your business!*`;
      if (shopDetails?.mobile_no) {
        message += `\nFor queries, contact us at ${shopDetails.mobile_no}.`;
      }
      if (shopDetails?.address) {
        message += `\nVisit us at: ${shopDetails.address}.`;
      }

      const whatsappUrl = `https://wa.me/${customerMobileNo || currentSaleData.CustomerMaster?.MobileNo}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      toast.success("WhatsApp message prepared!");
      // Reset flag after action is completed
      isActionFromNew.current = false; 

    } catch (error: any) {
      toast.error("Failed to prepare WhatsApp message", { description: error.message });
    } finally {
      setIsSubmitting(false);
      setIsSendingWhatsApp(false); // Reset state
    }
  }, [shopDetails, saveSale, fetchData, isSendingWhatsApp]);

  useEffect(() => {
    // Only run this effect once per component mount for initial actions
    if (location.state?.action && saleId && !loading && !hasHandledInitialAction) {
      const action = location.state.action;
      // Clear the state immediately to prevent re-triggering on subsequent renders
      window.history.replaceState({}, document.title); 

      if (action === 'send-whatsapp') {
        handleSendWhatsApp(Number(saleId));
      } else if (action === 'print-invoice') {
        handlePrint(Number(saleId));
      }
      setHasHandledInitialAction(true); // Mark as handled
    }
  }, [location.state, saleId, loading, handleSendWhatsApp, handlePrint, hasHandledInitialAction]);

  useEffect(() => {
    const currentMobileNo = form.getValues("customerMobileNo");
    if (selectedCustomer) {
      const newMobileNo = selectedCustomer.MobileNo || "";
      if (currentMobileNo !== newMobileNo) {
        form.setValue("customerMobileNo", newMobileNo, { shouldValidate: true });
      }
    } else {
      if (!form.formState.dirtyFields.customerMobileNo && currentMobileNo !== "") {
        form.setValue("customerMobileNo", "", { shouldValidate: true });
      }
    }
  }, [selectedCustomer, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "CustomerName") {
        const currentCustomerName = value.CustomerName;
        if (selectedCustomer && currentCustomerName?.toLowerCase() !== selectedCustomer.CustomerName.toLowerCase()) {
          setSelectedCustomer(null);
        } else if (!currentCustomerName) {
          setSelectedCustomer(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, selectedCustomer]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("CustomerName", customer.CustomerName, { shouldValidate: true });
  };

  const handleCustomerNameChange = (name: string) => {
    form.setValue("CustomerName", name, { shouldValidate: true });
  };

  const handleCurrentItemChange = (field: keyof typeof currentItem, value: string | number) => {
    const updatedItem = { ...currentItem, [field]: value };
    if (field === "ItemName") {
      const selected = itemSuggestions.find(i => (i.ItemName ?? '').toLowerCase() === String(value).toLowerCase());
      updatedItem.ItemId = selected ? selected.ItemId : "";
      updatedItem.CategoryName = selected ? selected.CategoryMaster?.CategoryName : "";
      updatedItem.Barcode = selected ? selected.Barcode : "";
      updatedItem.ItemCode = selected ? selected.ItemCode : "";
      updatedItem.UnitPrice = selected?.SellPrice || 0;
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
      UnitPrice: selectedItem.SellPrice || 0,
      TotalPrice: selectedItem.SellPrice || 0,
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
      setAddedItems([...addedItems, currentItem as SaleListItem]);
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
    setItemSuggestions((prevSuggestions) => [...prevSuggestions, newSuggestion]);

    const newItemForList: SaleListItem = {
      ItemId: newItem.ItemId,
      ItemName: newItem.ItemName ?? '',
      CategoryName: newSuggestion.CategoryMaster?.CategoryName,
      Barcode: newItem.Barcode,
      ItemCode: newItem.ItemCode,
      Qty: 1,
      Unit: "Piece",
      UnitPrice: newItem.SellPrice || 0,
      TotalPrice: newItem.SellPrice || 0,
    };

    setAddedItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) =>
          item.ItemId === newItemForList.ItemId &&
          item.Unit === newItemForList.Unit &&
          item.UnitPrice === newItemForList.UnitPrice
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        existingItem.Qty += newItemForList.Qty;
        existingItem.TotalPrice = parseFloat((existingItem.Qty * existingItem.UnitPrice).toFixed(2));
        toast.success(`Quantity for "${newItemForList.ItemName}" updated.`);
        return updatedItems;
      } else {
        toast.success(`Item "${newItemForList.ItemName}" added.`);
        return [...prevItems, newItemForList];
      }
    });

    setCurrentItem(EMPTY_ITEM);
    itemInputRef.current?.focus();
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

  const isCurrentItemNew = currentItem.ItemName && !itemSuggestions.some(i => (i.ItemName ?? '').toLowerCase() === (currentItem.ItemName ?? '').toLowerCase();

  const handleFormSubmit = async (values: SaleFormValues) => {
    const success = await saveSale(values);
    if (success) {
      setIsPostSaveActionsDialogOpen(true);
    }
  };

  const handleSendWhatsAppFromDialog = (saleId: number) => {
    handleSendWhatsApp(saleId);
    setIsPostSaveActionsDialogOpen(false);
  };

  const handlePrintFromDialog = (saleId: number) => {
    handlePrint(saleId);
    setIsPostSaveActionsDialogOpen(false);
  };

  const handleReturnToListFromDialog = () => {
    navigate("/sales-module/sales-invoice");
    setIsPostSaveActionsDialogOpen(false);
  };

  const invoiceDataForPrint = saleData;

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
        <SaleInvoice sale={invoiceDataForPrint} ref={invoiceRef} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Sale</CardTitle>
          <div className="flex space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => handlePrint(Number(saleId))} disabled={isSubmitting || loading || !saleData}>
                  <span className="flex items-center">
                    <Printer className="mr-2 h-4 w-4" />
                    <span>Print</span>
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print Invoice</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => handleSendWhatsApp(Number(saleId))} disabled={isSubmitting || loading || !saleData || !saleData.CustomerMaster?.MobileNo || isSendingWhatsApp}>
                  <span className="flex items-center">
                    <img src="/whatsapp.svg" alt="WhatsApp" className="mr-2 h-4 w-4" />
                    <span>WhatsApp</span>
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send via WhatsApp</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name="CustomerName"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <EntityAutocomplete<Customer>
                            id="customer-name"
                            label="Customer Name (Optional)"
                            suggestions={customerSuggestions}
                            value={field.value ?? ""}
                            onValueChange={handleCustomerNameChange}
                            onSelect={handleCustomerSelect}
                            getId={(c) => c.CustomerId}
                            getName={(c) => c.CustomerName}
                            getMobileNo={(c) => c.MobileNo}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerMobileNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingLabelInput id="customerMobileNo" label="Customer Mobile No. (Optional)" type="tel" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FormField control={form.control} name="SaleDate" render={({ field }) => (
                    <FormItem>
                      <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                        <div className="relative">
                          <Label className={cn("absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10", field.value || isDatePickerOpen ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary" : "top-1/2 -translate-y-1/2 text-base text-muted-foreground")}>Sale Date</Label>
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="AdditionalDiscount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput 
                              id="AdditionalDiscount" 
                              label="Additional Discount" 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={(e) => {
                                field.onChange(e);
                                setLastDiscountChangeSource('amount');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="DiscountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingLabelInput 
                              id="DiscountPercentage" 
                              label="Discount Percentage (%)" 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""} 
                              onChange={(e) => {
                                field.onChange(e);
                                setLastDiscountChangeSource('percentage');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
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
                    <span>Invoice Total: {formatCurrency(grandTotal)}</span>
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
                <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg">
                  <div className="flex-1 min-w-[80px]"><FloatingLabelInput value={currentItem.ItemCode || (typeof currentItem.ItemId === 'number' ? generateItemCode(currentItem.CategoryName, currentItem.ItemId) : "")} label="Code" id="current_item_code" readOnly className="bg-muted/50 font-mono text-xs" /></div>
                  <div className="relative flex-1 min-w-[250px]">
                    <Autocomplete<ItemWithCategory> ref={itemInputRef} suggestions={itemSuggestions} value={currentItem.ItemName} onValueChange={(v: string) => handleCurrentItemChange("ItemName", v)} onSelect={handleItemSelect} label="Item Name" id="current_item" className={cn(isCurrentItemNew && "pr-24")} 
                      getId={(item) => item.ItemId}
                      getName={(item) => item.ItemName || ''
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
                  <div className="flex-1 min-w-[90px]"><FloatingLabelInput type="number" value={currentItem.UnitPrice} onChange={(e) => handleCurrentItemChange("UnitPrice", e.target.valueAsNumber)} label="Unit Price" id="current_unit_price" /></div>
                  <div className="flex-1 min-w-[90px]"><FloatingLabelInput type="number" value={currentItem.TotalPrice} onChange={(e) => handleCurrentItemChange("TotalPrice", e.target.valueAsNumber)} label="Total" id="current_total" /></div>
                  <div><Button type="button" onClick={handleAddItem} className="self-center h-10 w-full" aria-label="Add item"><Plus className="h-4 w-4" /></Button></div>
                </div>
              </div>

              {addedItems.length > 0 && (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {addedItems.map((item: SaleListItem, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.ItemName}</TableCell>
                          <TableCell className="text-right">{item.Qty}</TableCell>
                          <TableCell>{item.Unit}</TableCell>
                          <TableCell className="text-right">{item.UnitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.TotalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleEditItem(index)} aria-label="Edit item"><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => { const newItems = [...addedItems]; newItems.splice(index, 1); setAddedItems(newItems); }} aria-label="Delete item"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-between items-start gap-4 pt-4">
                <div className="flex space-x-2 w-full sm:w-auto">
                  <Link to="/sales-module/sales-invoice" className="flex-1 sm:flex-none"><Button type="button" variant="outline" className="w-full">Cancel</Button></Link>
                  <Button type="submit" disabled={isSubmitting || !isValid || addedItems.length === 0} className="flex-1 sm:flex-none">{isSubmitting ? "Saving..." : "Save Sale"}</Button>
                </div>
                <div className="w-full sm:w-auto sm:max-w-xs space-y-1 text-sm self-end">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Items Total</span>
                        <span>{formatCurrency(itemsTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span>- {formatCurrency(watchedAdditionalDiscount || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                        <span>Grand Total</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <AddNewItemInlineDialog open={isCreateItemOpen} onOpenChange={setCreateItemOpen} initialItemName={currentItem.ItemName} onItemAdded={handleItemCreated} />
      <BarcodeScannerDialog open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScan} />
      <SalePostSaveActionsDialog
        open={isPostSaveActionsDialogOpen}
        onOpenChange={setIsPostSaveActionsDialogOpen}
        saleId={newlyCreatedSaleId}
        onSendWhatsApp={handleSendWhatsAppFromDialog}
        onPrint={handlePrintFromDialog}
        onReturnToList={handleReturnToListFromDialog}
      />
    </div>
  );
}