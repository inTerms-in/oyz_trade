import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InventoryStockLedgerPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Stock Ledger</CardTitle>
          <CardDescription>Detailed in/out entries for inventory items.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Inventory Stock Ledger will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}