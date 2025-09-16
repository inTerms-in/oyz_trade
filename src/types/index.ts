export interface Category {
  CategoryId: number;
  CategoryName: string;
  created_at?: string;
}

export interface ExpenseCategory {
  ExpenseCategoryId: number;
  CategoryName: string;
  Description?: string | null;
  created_at?: string;
}

export interface Item {
  ItemId: number;
  ItemName: string;
  CategoryId?: number | null;
  SellPrice?: number | null;
  Barcode?: string | null;
  ItemCode?: string | null;
  RackNo?: string | null;
  created_at?: string;
}

export interface ItemMaster { // Explicitly define ItemMaster
  ItemId: number;
  ItemName: string;
  ItemCode?: string | null;
  Barcode?: string | null;
  SellPrice?: number | null;
}

export interface ItemWithCategory extends Item {
  CategoryMaster?: Category | null;
}

export interface ItemWithStock extends Item {
  CategoryName?: string | null;
  current_stock: number;
  total_purchased?: number | null;
  total_sold?: number | null;
  total_customer_returned?: number | null;
  total_vendor_returned?: number | null;
  total_manual_adjusted_in?: number | null;
  total_manual_adjusted_out?: number | null;
}

export interface PrintableItem extends ItemWithCategory {
  quantityToPrint: number;
  uniqueKey?: string; // For React keys when flattening
}

export interface Customer {
  CustomerId: number;
  CustomerName: string;
  MobileNo?: string | null;
  created_at?: string;
}

export interface CustomerMaster { // Explicitly define CustomerMaster
  CustomerId: number;
  CustomerName: string;
  MobileNo?: string | null;
}

export interface Supplier {
  SupplierId: number;
  SupplierName: string;
  MobileNo?: string | null;
  created_at?: string;
}

export interface SaleItem {
  SalesItemId: number;
  SaleId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  created_at?: string;
  ItemMaster?: ItemWithCategory | null;
}

export interface Sale {
  SaleId: number;
  SaleDate: string;
  CustomerId?: number | null;
  TotalAmount: number;
  ReferenceNo: string;
  AdditionalDiscount?: number | null;
  DiscountPercentage?: number | null;
  PaymentType: 'Cash' | 'Bank' | 'Credit' | 'Mixed';
  PaymentMode?: string | null;
  CashAmount?: number | null;
  BankAmount?: number | null;
  CreditAmount?: number | null;
  created_at?: string;
}

export interface SaleWithItems extends Sale {
  SalesItem: SaleItem[];
  CustomerMaster?: Customer | null;
}

export interface PurchaseItem {
  PurchaseItemId: number;
  PurchaseId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  created_at?: string;
  ItemMaster?: ItemWithCategory | null;
}

export interface Purchase {
  PurchaseId: number;
  PurchaseDate: string;
  SupplierId?: number | null;
  TotalAmount: number;
  ReferenceNo: string;
  AdditionalCost?: number | null;
  PaymentType: 'Cash' | 'Bank' | 'Credit' | 'Mixed';
  PaymentMode?: string | null;
  CashAmount?: number | null;
  BankAmount?: number | null;
  CreditAmount?: number | null;
  created_at?: string;
}

export interface PurchaseWithItems extends Purchase {
  PurchaseItem: PurchaseItem[];
  SupplierMaster?: Supplier | null;
}

export interface Expense {
  ExpenseId: number;
  ExpenseDate: string;
  Amount: number;
  Description?: string | null;
  ExpenseCategoryId?: number | null;
  ReferenceNo?: string | null;
  CreatedAt?: string;
  ExpenseCategoryMaster?: ExpenseCategory | null;
}

export interface StockAdjustment {
  StockAdjustmentId: number;
  ItemId: number;
  AdjustmentType: 'in' | 'out';
  Quantity: number;
  Reason?: string | null;
  AdjustmentDate?: string;
  created_at?: string;
  ItemMaster?: Item | null;
}

export interface SalesReturnItem {
  SalesReturnItemId: number;
  SalesReturnId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  created_at?: string;
  ItemMaster?: ItemWithCategory | null;
}

export interface SalesReturn {
  SalesReturnId: number;
  SaleId?: number | null;
  ReturnDate: string;
  TotalRefundAmount: number;
  Reason?: string | null;
  ReferenceNo: string;
  created_at?: string;
}

export interface SalesReturnWithItems extends SalesReturn {
  SalesReturnItem: SalesReturnItem[];
  Sales?: Sale | null; // Original Sale details
}

export interface PurchaseReturnItem {
  PurchaseReturnItemId: number;
  PurchaseReturnId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  created_at?: string;
  ItemMaster?: ItemWithCategory | null;
}

export interface PurchaseReturn {
  PurchaseReturnId: number;
  PurchaseId?: number | null;
  ReturnDate: string;
  TotalRefundAmount: number;
  Reason?: string | null;
  ReferenceNo: string;
  created_at?: string;
}

export interface PurchaseReturnWithItems extends PurchaseReturn {
  PurchaseReturnItem: PurchaseReturnItem[];
  Purchase?: Purchase | null; // Original Purchase details
}

export interface HourlySales {
  hour: number;
  total_sales: number;
}

export interface Receivable {
  ReceivableId: number;
  SaleId?: number | null;
  CustomerId?: number | null;
  Amount: number;
  Balance: number;
  DueDate?: string | null;
  Status: 'Outstanding' | 'Partially Paid' | 'Paid';
  created_at?: string;
  updated_at?: string;
  ReferenceNo?: string | null; // Assuming receivables might have a reference number
}

export interface ReceivableSettlement {
  SettlementId: number;
  ReceiptVoucherId: number;
  ReceivableId: number;
  AmountSettled: number;
  created_at?: string;
  updated_at?: string;
  Receivables?: Receivable | null; // Joined Receivable details
}

export interface ReceiptVoucher {
  ReceiptVoucherId: number;
  CustomerId?: number | null;
  ReceiptDate: string;
  AmountReceived: number;
  PaymentType: 'Cash' | 'Bank' | 'Mixed';
  PaymentMode?: string | null;
  CashAmount?: number | null;
  BankAmount?: number | null;
  ReferenceNo: string;
  Description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReceiptVoucherWithSettlements extends ReceiptVoucher {
  CustomerMaster?: Customer | null;
  receivable_settlements: ReceivableSettlement[];
}

export interface Payable {
  PayableId: number;
  PurchaseId?: number | null;
  SupplierId?: number | null;
  Amount: number;
  Balance: number;
  DueDate?: string | null;
  Status: 'Outstanding' | 'Partially Paid' | 'Paid';
  created_at?: string;
  updated_at?: string;
  ReferenceNo?: string | null; // Assuming payables might have a reference number
}

export interface PayableSettlement {
  SettlementId: number;
  PaymentVoucherId: number;
  PayableId: number;
  AmountSettled: number;
  created_at?: string;
  updated_at?: string;
  Payables?: Payable | null; // Joined Payable details
}

export interface PaymentVoucher {
  PaymentVoucherId: number;
  SupplierId?: number | null;
  PaymentDate: string;
  AmountPaid: number;
  PaymentType: 'Cash' | 'Bank' | 'Mixed';
  PaymentMode?: string | null;
  CashAmount?: number | null;
  BankAmount?: number | null;
  ReferenceNo: string;
  Description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentVoucherWithSettlements extends PaymentVoucher {
  SupplierMaster?: Supplier | null;
  payable_settlements: PayableSettlement[];
}

export interface ReturnableItem {
  OriginalItemId: number; // Original SalesItemId or PurchaseItemId
  ItemId: number;
  ItemName: string;
  ItemCode: string;
  CategoryName?: string;
  QtyOriginal: number;
  QtyAlreadyReturned: number;
  QtyToReturn: number;
  Unit: string;
  UnitPrice: number;
  TotalPrice: number;
}

export interface ReceivableToSettle extends Receivable {
  amountToSettle: number;
  isSelected: boolean;
  Sales?: Sale | null; // Joined Sales details
  CustomerMaster?: Customer | null; // Joined Customer details
}

export interface PayableToSettle extends Payable {
  amountToSettle: number;
  isSelected: boolean;
  Purchase?: Purchase | null; // Joined Purchase details
  SupplierMaster?: Supplier | null; // Joined Supplier details
}

export interface MonthlySalesSummary {
  month_year: string; // e.g., "January 2023"
  total_sales_amount: number;
  total_sales_count: number;
  total_items_sold: number;
}

export interface SalesDetailItem {
  SalesItemId: number;
  ItemId: number;
  Qty: number;
  Unit: string;
  UnitPrice: number;
  ItemMaster: {
    ItemName: string;
    ItemCode: string;
  };
}

export interface SalesDetail {
  SaleId: number;
  SaleDate: string;
  ReferenceNo: string;
  TotalAmount: number;
  AdditionalDiscount: number | null;
  DiscountPercentage: number | null;
  PaymentType: string;
  PaymentMode: string | null;
  CashAmount: number | null;
  BankAmount: number | null;
  CreditAmount: number | null;
  CustomerMaster: {
    CustomerId: number;
    CustomerName: string;
    MobileNo: string | null;
  } | null;
  SalesItem: SalesDetailItem[];
}

export interface ShopDetails {
  shop_name: string;
  mobile_no: string | null;
  address: string | null;
}