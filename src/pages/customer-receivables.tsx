import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CustomerReceivablesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Receivables</CardTitle>
          <CardDescription>View customer aging and outstanding reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Customer Receivables will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}