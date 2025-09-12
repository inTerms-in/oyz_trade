import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FinancialPayablesAgingPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Payables Aging Report</CardTitle>
          <CardDescription>Analyze the age of outstanding payables.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Financial Payables Aging Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}