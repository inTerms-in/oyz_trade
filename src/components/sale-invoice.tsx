import React from "react";
import { SaleWithItems } from "@/types";
import { generateItemCode } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaleInvoiceProps {
  sale: SaleWithItems | null;
}

interface ShopDetails {
  shop_name: string;
  mobile_no: string | null;
  address: string | null;
}

export const SaleInvoice = React.forwardRef<HTMLDivElement, SaleInvoiceProps>(
  ({ sale }, ref) => {
    const [shopDetails, setShopDetails] = React.useState<ShopDetails | null>(null);

    React.useEffect(() => {
      async function fetchShopDetails() {
        const { data, error } = await supabase
          .from("shop")
          .select("shop_name, mobile_no, address")
          .single();

        if (error && error.code !== 'PGRST116') {
          toast.error("Failed to fetch shop details for invoice", { description: error.message });
        } else if (data) {
          setShopDetails(data);
        }
      }
      fetchShopDetails();
    }, []);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
    };

    return (
      <div ref={ref} className="p-8 font-sans text-gray-800">
        {sale && (
          <>
            <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sale Invoice</h1>
                <p className="text-sm text-gray-500">Ref No: {sale.ReferenceNo}</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-light text-gray-600">{shopDetails?.shop_name || 'PurchaseTracker'}</h2>
                {shopDetails?.mobile_no && <p className="text-sm text-gray-500">Mobile: {shopDetails.mobile_no}</p>}
                {shopDetails?.address && <p className="text-sm text-gray-500">{shopDetails.address}</p>}
              </div>
            </header>

            <section className="grid grid-cols-2 gap-8 my-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</h3>
                <p className="font-bold">{sale.CustomerMaster?.CustomerName || 'Walk-in Customer'}</p>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoice Details</h3>
                <p><span className="font-semibold">Date:</span> {new Date(sale.SaleDate).toLocaleDateString()}</p>
                <p><span className="font-semibold">Payment Type:</span> {sale.PaymentType}</p>
                {sale.PaymentMode && <p><span className="font-semibold">Payment Mode:</span> {sale.PaymentMode}</p>}
              </div>
            </section>

            <section>
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Item Code</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Qty</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Unit Price</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.SalesItem.map((item: SaleItem) => {
                    const itemCode = item.ItemMaster?.ItemCode || generateItemCode(
                      item.ItemMaster?.CategoryMaster?.CategoryName,
                      item.ItemId
                    );
                    const itemTotal = item.UnitPrice * item.Qty;

                    return (
                      <tr key={item.SalesItemId} className="border-b border-gray-100">
                        <td className="p-3 font-mono text-xs">{itemCode}</td>
                        <td className="p-3">{item.ItemMaster?.ItemName || 'N/A'}</td>
                        <td className="p-3 text-right">{item.Qty} {item.Unit}</td>
                        <td className="p-3 text-right">{formatCurrency(item.UnitPrice)}</td>
                        <td className="p-3 text-right">{formatCurrency(itemTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="flex justify-end mt-8">
              <div className="w-full max-w-xs">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(sale.TotalAmount + (sale.AdditionalDiscount || 0))}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Discount</span>
                  <span>- {formatCurrency(sale.AdditionalDiscount || 0)} {sale.DiscountPercentage ? `(${sale.DiscountPercentage}%)` : ''}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-xl border-t-2 border-gray-200 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(sale.TotalAmount)}</span>
                </div>
                {sale.PaymentType === 'Mixed' && (
                  <div className="mt-4 pt-2 border-t border-gray-200 text-sm">
                    <h4 className="font-semibold mb-1">Payment Split:</h4>
                    {sale.CashAmount && sale.CashAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Cash Received:</span>
                        <span>{formatCurrency(sale.CashAmount)}</span>
                      </div>
                    )}
                    {sale.BankAmount && sale.BankAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Bank Received:</span>
                        <span>{formatCurrency(sale.BankAmount)}</span>
                      </div>
                    )}
                    {sale.CreditAmount && sale.CreditAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Credit (Outstanding):</span>
                        <span>{formatCurrency(sale.CreditAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <footer className="text-center text-sm text-gray-400 mt-16">
              <p>Thank you for your business!</p>
            </footer>
          </>
        )}
      </div>
    );
  }
);