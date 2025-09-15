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