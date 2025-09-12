import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AccountsDashboardPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Accounts Dashboard</CardTitle>
          <CardDescription>Overview of financial accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Accounts Dashboard will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}