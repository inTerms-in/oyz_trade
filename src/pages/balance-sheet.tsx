import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function BalanceSheetPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>View the balance sheet report.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Balance Sheet will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}