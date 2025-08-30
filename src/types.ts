export interface Category {
  CategoryId: number;
  CategoryName: string;
  // created_at: string; // Removed
}

export interface Item {
  ItemId: number;
  ItemName: string | null; // Changed to allow null
  CategoryId: number;
  // created_at: string; // Removed
  SellPrice: number | null;
  Barcode?: string | null;
  ItemCode?: string | null;
  RackNo?: string | null; // Added RackNo
}

export interface ItemWithCategory extends Item {
  CategoryMaster: {
    CategoryName: string;
  } | null;
  lastPurchasedDate?: string;
  lastPurchasedPrice?: number;
}

export interface ItemWithStock extends Item {
  CategoryName: string | null;
  total_purchased: number;
  total_sold: number;
  total_adjusted_in: number; // Added for stock adjustments
  total_adjusted_out: number; // Added for stock adjustments
  current_stock: number;
  RackNo?: string | null; // Added RackNo
  // ItemName: string | null; // Removed as it's now handled by extending Item
}

export interface PurchaseItem {
  PurchaseItemId: number;
  PurchaseId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  // created_at: string; // Removed
  ItemMaster?: {
    ItemName: string | null; // Changed to allow null
    Barcode?: string | null;
    CategoryMaster?: {
      CategoryName: string;
    } | null;
    ItemCode?: string | null;
    RackNo?: string | null; // Added RackNo
    SellPrice: number | null; // Added SellPrice
  } | null;
}

export interface Supplier {
  SupplierId: number;
  SupplierName: string;
  MobileNo: string | null;
}

export interface Purchase {
  PurchaseId: number;
  PurchaseDate: string;
  SupplierId: number | null;
  TotalAmount: number;
  // created_at: string; // Removed
  ReferenceNo?: string;
  AdditionalCost?: number | null;
}

export interface PurchaseWithItems extends Purchase {
  PurchaseItem: PurchaseItem[];
  SupplierMaster?: Supplier | null;
}

export interface SaleItem {
  SalesItemId: number;
  SaleId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  // created_at: string; // Removed
  ItemMaster?: {
    ItemName: string | null; // Changed to allow null
    Barcode?: string | null;
    CategoryMaster?: {
      CategoryName: string;
    } | null;
    ItemCode?: string | null;
    RackNo?: string | null; // Added RackNo
    SellPrice: number | null; // Added SellPrice
  } | null;
}

export interface Customer {
  CustomerId: number;
  CustomerName: string;
  MobileNo: string | null;
}

export interface Sale {
  SaleId: number;
  SaleDate: string;
  CustomerId: number | null;
  TotalAmount: number;
  // created_at: string; // Removed
  AdditionalDiscount?: number | null;
  DiscountPercentage?: number | null; // Added DiscountPercentage
  ReferenceNo?: string;
}

export interface SaleWithItems extends Sale {
  SalesItem: SaleItem[];
  CustomerMaster?: Customer | null;
}

export interface StockAdjustment {
  StockAdjustmentId: number;
  ItemId: number;
  AdjustmentType: 'in' | 'out';
  Quantity: number;
  Reason: string | null;
  AdjustmentDate: string;
  ItemMaster?: {
    ItemName: string | null;
    ItemCode: string | null;
  } | null;
}

export interface ExpenseCategory {
  ExpenseCategoryId: number;
  CategoryName: string;
  Description: string | null;
}

export interface Expense {
  ExpenseId: number;
  ExpenseDate: string;
  Amount: number;
  Description: string | null;
  ExpenseCategoryId: number | null;
  ReferenceNo: string | null;
  CreatedAt: string;
  ExpenseCategoryMaster?: ExpenseCategory | null; // For joining
}

// Added mobileNo to SearchableSelectItem for customer/supplier options
export interface SearchableSelectItem {
  value: string;
  label: string;
  mobileNo?: string | null; // Added optional mobileNo
}

export interface PrintableItem extends ItemWithCategory {
  quantityToPrint: number;
}

export interface Settings {
  id: string;
  user_id: string;
  financial_year_start_month: number;
  created_at: string;
  updated_at: string;
}

export interface ReferenceNumberSequence {
  id: string;
  user_id: string;
  prefix: string;
  financial_year: string;
  last_sequence_no: number;
  updated_at: string;
}

export interface HourlySales {
  hour: number;
  total_sales: number;
}

export interface ShopDetails {
  shop_name: string;
  mobile_no: string | null;
  address: string | null;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}