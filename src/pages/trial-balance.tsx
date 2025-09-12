import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TrialBalancePage() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
          <CardDescription>View the trial balance report.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for Trial Balance will go here.</p>
        </CardContent>
      </Card>
    </div>
  );
}