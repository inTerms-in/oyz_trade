import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function MonthlySalesSummaryPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Summary</CardTitle>
          <CardDescription>View sales data summarized by month.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Monthly Sales Summary will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}