"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, Store } from "lucide-react";
import Papa from "papaparse";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-provider";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { SelectItem } from "@/components/ui/select";
import { EditShopDetailsDialog } from "@/components/edit-shop-details-dialog";

interface CategoryCsvRow {
  CategoryName?: string;
}

interface ItemCsvRow {
  ItemName?: string;
  CategoryName?: string;
  SellPrice?: string;
  Barcode?: string;
}

function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingCategories, setIsImportingCategories] = useState(false);
  const [isImportingItems, setIsImportingItems] = useState(false);
  const [categoryFile, setCategoryFile] = useState<File | null>(null);
  const [itemFile, setItemFile] = useState<File | null>(null);
  const { user } = useAuth();

  const [financialYearStartMonth, setFinancialYearStartMonth] = useState<number>(4); // Default to April
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEditShopDetailsOpen, setIsEditShopDetailsOpen] = useState(false);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const fetchSettings = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("settings")
      .select("financial_year_start_month")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      toast.error("Failed to fetch settings", { description: error.message });
    } else if (data) {
      setFinancialYearStartMonth(data.financial_year_start_month);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    if (!user?.id) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    setIsSavingSettings(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: user.id, financial_year_start_month: financialYearStartMonth }, { onConflict: 'user_id' });

    setIsSavingSettings(false);
    if (error) {
      toast.error("Failed to save settings", { description: error.message });
    } else {
      toast.success("Settings saved successfully!");
    }
  };

  const handleExport = async () => {
    if (!user?.id) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    setIsExporting(true);
    toast.info("Starting data export...", { description: "This may take a moment." });

    try {
      const zip = new JSZip();

      // Fetch and add categories
      const { data: categories } = await supabase.from("CategoryMaster").select("*").eq("user_id", user.id);
      if (categories) zip.file("categories.csv", Papa.unparse(categories));

      // Fetch and add items
      const { data: items } = await supabase.from("ItemMaster").select("*").eq("user_id", user.id);
      if (items) zip.file("items.csv", Papa.unparse(items));

      // Fetch and add purchases
      const { data: purchases } = await supabase.from("Purchase").select("*").eq("user_id", user.id);
      if (purchases) zip.file("purchases.csv", Papa.unparse(purchases));

      // Fetch and add purchase items
      const { data: purchaseItems } = await supabase.from("PurchaseItem").select("*").eq("user_id", user.id);
      if (purchaseItems) zip.file("purchase_items.csv", Papa.unparse(purchaseItems));

      // Fetch and add sales
      const { data: sales } = await supabase.from("Sales").select("*").eq("user_id", user.id);
      if (sales) zip.file("sales.csv", Papa.unparse(sales));

      // Fetch and add sales items
      const { data: salesItems } = await supabase.from("SalesItem").select("*").eq("user_id", user.id);
      if (salesItems) zip.file("sales_items.csv", Papa.unparse(salesItems));

      // Fetch and add customers
      const { data: customers } = await supabase.from("CustomerMaster").select("*").eq("user_id", user.id);
      if (customers) zip.file("customers.csv", Papa.unparse(customers));

      // Fetch and add suppliers
      const { data: suppliers } = await supabase.from("SupplierMaster").select("*").eq("user_id", user.id);
      if (suppliers) zip.file("suppliers.csv", Papa.unparse(suppliers));

      // Fetch and add expenses
      const { data: expenses } = await supabase.from("Expenses").select("*").eq("user_id", user.id);
      if (expenses) zip.file("expenses.csv", Papa.unparse(expenses));

      // Fetch and add expense categories
      const { data: expenseCategories } = await supabase.from("ExpenseCategoryMaster").select("*").eq("user_id", user.id);
      if (expenseCategories) zip.file("expense_categories.csv", Papa.unparse(expenseCategories));

      // Fetch and add stock adjustments
      const { data: stockAdjustments } = await supabase.from("StockAdjustment").select("*").eq("user_id", user.id);
      if (stockAdjustments) zip.file("stock_adjustments.csv", Papa.unparse(stockAdjustments));

      // Fetch and add shop details (user-specific)
      const { data: shopData } = await supabase.from("shop").select("*").eq("user_id", user.id);
      if (shopData) zip.file("shop_details.csv", Papa.unparse(shopData));

      // Fetch and add reference number sequences (user-specific)
      const { data: refSequences } = await supabase.from("reference_number_sequences").select("*").eq("user_id", user.id);
      if (refSequences) zip.file("reference_number_sequences.csv", Papa.unparse(refSequences));


      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
      link.download = `purchasetracker_backup_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Data exported successfully!");

    } catch (error: any) {
      toast.error("Export failed", { description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCategoryTemplate = () => {
    downloadTemplate("category_template.csv", "CategoryName\nGroceries\nElectronics");
  };

  const handleDownloadItemTemplate = () => {
    downloadTemplate("item_template.csv", "ItemName,CategoryName,SellPrice,Barcode\nMilk,Groceries,5.99,123456789012\nLaptop,Electronics,1200,987654321098");
  };

  const handleImportCategories = async () => {
    if (!categoryFile) return toast.error("Please select a file to import.");
    if (!user?.id) return toast.error("Authentication error. Please log in again.");
    setIsImportingCategories(true);
    toast.info("Starting category import...");

    Papa.parse(categoryFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const parsedData = results.data;
        const validData = parsedData.filter((row: CategoryCsvRow) => row.CategoryName && row.CategoryName.trim() !== "");

        if (validData.length === 0) {
          toast.error("No valid data found in the file.", { description: "Please ensure the file has a 'CategoryName' column with data." });
          setIsImportingCategories(false);
          return;
        }

        const { data: existingCategories, error: fetchError } = await supabase.from("CategoryMaster").select("CategoryName").eq("user_id", user.id);
        if (fetchError) {
          toast.error("Failed to check for existing categories.", { description: fetchError.message });
          setIsImportingCategories(false);
          return;
        }
        const existingNames = new Set(existingCategories.map(c => c.CategoryName.toLowerCase()));
        
        const newCategories = validData
          .filter((row: CategoryCsvRow) => !existingNames.has(row.CategoryName!.trim().toLowerCase()))
          .map((row: CategoryCsvRow) => ({ CategoryName: row.CategoryName!.trim(), user_id: user.id })); // Add user_id

        const duplicateCount = validData.length - newCategories.length;

        if (newCategories.length === 0) {
          toast.info("No new categories to import.", { description: `${duplicateCount} categories already exist.` });
          setIsImportingCategories(false);
          setCategoryFile(null);
          return;
        }

        const { error: insertError } = await supabase.from("CategoryMaster").insert(newCategories);

        if (insertError) {
          toast.error("Failed to import categories.", { description: insertError.message });
        } else {
          toast.success("Categories imported successfully!", { description: `${newCategories.length} new categories added. ${duplicateCount} duplicates were skipped.` });
        }
        setIsImportingCategories(false);
        setCategoryFile(null);
      },
      error: (error: any) => {
        toast.error("Failed to parse CSV file.", { description: error.message });
        setIsImportingCategories(false);
      }
    });
  };

  const handleImportItems = async () => {
    if (!itemFile) return toast.error("Please select a file to import.");
    if (!user?.id) return toast.error("Authentication error. Please log in again.");
    setIsImportingItems(true);
    toast.info("Starting item import... This may take a while.");

    Papa.parse(itemFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const parsedData = results.data;
          const validData = parsedData.filter((row: ItemCsvRow) => row.ItemName && row.ItemName.trim() !== "" && row.CategoryName && row.CategoryName.trim() !== "");

          if (validData.length === 0) {
            throw new Error("No valid data found. Ensure 'ItemName' and 'CategoryName' columns are present and filled.");
          }

          const { data: existingItemsData } = await supabase.from("ItemMaster").select("ItemName").eq("user_id", user.id);
          const existingItemNames = new Set(existingItemsData?.map(i => i.ItemName!.toLowerCase()));

          const { data: existingCategoriesData } = await supabase.from("CategoryMaster").select("CategoryId, CategoryName").eq("user_id", user.id);
          const categoryMap = new Map(existingCategoriesData?.map(c => [c.CategoryName.toLowerCase(), c.CategoryId]));

          const uniqueCategoryNames = new Set(validData.map((row: ItemCsvRow) => row.CategoryName!.trim().toLowerCase()));
          const newCategoryNames = [...uniqueCategoryNames].filter((name) => !categoryMap.has(name as string));

          if (newCategoryNames.length > 0) {
            toast.info(`Found ${newCategoryNames.length} new categories. Creating them now...`);
            const newCategoriesToInsert = newCategoryNames.map(name => ({
              CategoryName: (name as string).split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
              user_id: user.id, // Add user_id
            }));
            const { data: insertedCategories, error: categoryInsertError } = await supabase.from("CategoryMaster").insert(newCategoriesToInsert).select();
            if (categoryInsertError) throw new Error(`Failed to create new categories: ${categoryInsertError.message}`);
            
            insertedCategories?.forEach(c => categoryMap.set(c.CategoryName.toLowerCase(), c.CategoryId));
          }

          let duplicateCount = 0;
          const newItemsToInsert = [];

          for (const row of validData) {
            const itemNameLower = row.ItemName!.trim().toLowerCase();
            if (existingItemNames.has(itemNameLower)) {
              duplicateCount++;
              continue;
            }

            const categoryNameLower = row.CategoryName!.trim().toLowerCase();
            const categoryId = categoryMap.get(categoryNameLower);

            if (!categoryId) {
              console.warn(`Could not find or create category: ${row.CategoryName}`);
              continue;
            }

            newItemsToInsert.push({
              ItemName: row.ItemName!.trim(),
              CategoryId: categoryId,
              SellPrice: row.SellPrice && !isNaN(parseFloat(row.SellPrice)) ? parseFloat(row.SellPrice) : null,
              Barcode: row.Barcode || null,
              user_id: user.id, // Add user_id
            });
            existingItemNames.add(itemNameLower);
          }

          const { error: itemInsertError } = await supabase.from("ItemMaster").insert(newItemsToInsert);
          if (itemInsertError) throw new Error(`Failed to import items: ${itemInsertError.message}`);

          toast.success("Items imported successfully!", { description: `${newItemsToInsert.length} new items added. ${duplicateCount} duplicates were skipped.` });

        } catch (error: any) {
          toast.error("Item import failed.", { description: error.message });
        } finally {
          setIsImportingItems(false);
          setItemFile(null);
        }
      },
      error: (error: any) => {
        toast.error("Failed to parse CSV file.", { description: error.message });
        setIsImportingItems(false);
      }
    });
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your application settings and data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg space-y-4">
            <div>
              <h3 className="font-semibold">Shop Details</h3>
              <p className="text-sm text-muted-foreground">Manage your shop's name, contact, and address for invoices.</p>
            </div>
            <Button onClick={() => setIsEditShopDetailsOpen(true)}>
              <Store className="mr-2 h-4 w-4" />
              Edit Shop Details
            </Button>
          </div>

          <div className="p-4 border rounded-lg space-y-4">
            <div>
              <h3 className="font-semibold">Financial Year Settings</h3>
              <p className="text-sm text-muted-foreground">Configure the start month for your financial year.</p>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <FloatingLabelSelect
                label="Financial Year Start Month"
                value={String(financialYearStartMonth)}
                onValueChange={(value) => setFinancialYearStartMonth(Number(value))}
                id="financial-year-start-month"
              >
                {months.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </FloatingLabelSelect>
            </div>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? "Saving..." : "Save Financial Year Settings"}
            </Button>
          </div>

          <div className="p-4 border rounded-lg flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Export My Data</h3>
              <p className="text-sm text-muted-foreground">Download all your categories, items, and purchases as CSV files.</p>
            </div>
            <Button onClick={handleExport} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>

          <div className="p-4 border rounded-lg space-y-4">
            <div>
              <h3 className="font-semibold">Import Categories</h3>
              <p className="text-sm text-muted-foreground">Bulk upload categories from a CSV file.</p>
              <Button variant="link" className="p-0 h-auto text-sm" onClick={handleDownloadCategoryTemplate}>Download Template</Button>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="category-file">CSV File</Label>
              <Input 
                id="category-file" 
                type="file" 
                accept=".csv"
                onChange={(e) => setCategoryFile(e.target.files ? e.target.files[0] : null)}
                className="file:text-foreground"
              />
            </div>
            <Button onClick={handleImportCategories} disabled={isImportingCategories || !categoryFile}>
              <Upload className="mr-2 h-4 w-4" />
              {isImportingCategories ? "Importing..." : "Import Categories"}
            </Button>
          </div>

          <div className="p-4 border rounded-lg space-y-4">
            <div>
              <h3 className="font-semibold">Import Items</h3>
              <p className="text-sm text-muted-foreground">Bulk upload items from a CSV file. New categories will be created automatically.</p>
              <Button variant="link" className="p-0 h-auto text-sm" onClick={handleDownloadItemTemplate}>Download Template</Button>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="item-file">CSV File</Label>
              <Input 
                id="item-file" 
                type="file" 
                accept=".csv"
                onChange={(e) => setItemFile(e.target.files ? e.target.files[0] : null)}
                className="file:text-foreground"
              />
            </div>
            <Button onClick={handleImportItems} disabled={isImportingItems || !itemFile}>
              <Upload className="mr-2 h-4 w-4" />
              {isImportingItems ? "Importing..." : "Import Items"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <EditShopDetailsDialog
        open={isEditShopDetailsOpen}
        onOpenChange={setIsEditShopDetailsOpen}
        onShopDetailsUpdated={fetchSettings}
      />
    </div>
  );
}

export default SettingsPage;