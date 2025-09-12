import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FinancialCashFlowPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Cash Flow Statement</CardTitle>
          <CardDescription>View the financial cash flow statement.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Financial Cash Flow Statement will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}