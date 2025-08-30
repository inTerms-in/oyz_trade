import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CustomerOutstandingReceivablesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer-wise Outstanding Receivables</CardTitle>
          <CardDescription>View outstanding amounts from customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Customer-wise Outstanding Receivables will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}