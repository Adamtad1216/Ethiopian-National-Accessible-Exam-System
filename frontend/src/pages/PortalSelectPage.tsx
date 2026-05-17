import { Link } from "react-router-dom";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PortalSelectPage() {
  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display">ENAES Portals</h1>
          <p className="text-muted-foreground mt-2">
            Select the portal that matches your role
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Student Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Students can create a new account and login to take exams.
              </p>
              <Button asChild className="w-full bg-gradient-primary">
                <Link to="/portal/student">Open Student Portal</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Admin & Examiner Portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Admins and examiners login here. Admin can create student and
                examiner accounts.
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link to="/portal/staff">Open Admin/Examiner Portal</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
