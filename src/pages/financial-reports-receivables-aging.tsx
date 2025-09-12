import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FinancialReceivablesAgingPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Receivables Aging Report</CardTitle>
          <CardDescription>Analyze the age of outstanding receivables.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Financial Receivables Aging Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}