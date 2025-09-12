import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProfitLossStatementPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <CardDescription>View the profit and loss statement.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Profit & Loss Statement will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}