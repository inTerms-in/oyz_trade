import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DateWiseSalesPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Date-wise Sales Report</CardTitle>
          <CardDescription>View sales data by date.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Date-wise Sales Report will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}