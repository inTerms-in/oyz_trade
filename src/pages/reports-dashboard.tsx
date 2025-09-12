import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ReportsDashboardPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports Dashboard</CardTitle>
          <CardDescription>Access all business and financial reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Reports Dashboard will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}