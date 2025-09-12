import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FinancialBalanceSheetPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Balance Sheet</CardTitle>
          <CardDescription>View the financial balance sheet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Financial Balance Sheet will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}