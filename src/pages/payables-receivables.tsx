import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PayablesReceivablesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payables & Receivables</CardTitle>
          <CardDescription>Manage and view payables and receivables.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Payables & Receivables will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}