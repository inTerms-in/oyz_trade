// ... existing code ...

export interface PaymentVoucherWithSettlements extends PaymentVoucher {
  payable_settlements: PayableSettlement[];
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

export interface ItemMaster {
  ItemId: number;
  ItemName: string;
  ItemCode: string;
}

export interface CustomerMaster {
  CustomerId: number;
  CustomerName: string;
}