import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ReorderLevelAlertsPage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reorder Level Alerts</CardTitle>
          <CardDescription>View items needing reorder.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Reorder Level Alerts will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}