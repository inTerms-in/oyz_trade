import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function StockLedgerPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Ledger</CardTitle>
          <CardDescription>View detailed in/out entries for stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Stock Ledger will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}