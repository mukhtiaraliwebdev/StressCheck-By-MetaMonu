
"use client";

import { useEffect, useState } from "react";
import { ReportCard } from "@/components/reports/ReportCard";
import type { CallReport } from "@/lib/types";
import { 
  getAnonymousReports, 
  getAuthenticatedUserReportsFromFirestore, // Use Firestore for authenticated users
  getAuthenticatedUserReportsFromLocalStorage // Keep for potential fallback or migration
} from "@/lib/reportStore";
import { BarChart3, Info, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StressChart } from "@/components/stress/StressChart";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const [reports, setReports] = useState<CallReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CallReport | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [isFetchingReports, setIsFetchingReports] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || authLoading) {
      // If auth is loading, we might not know user status yet.
      // Clear reports to avoid showing stale data if user logs out.
      if (authLoading) setReports([]);
      return;
    }

    const fetchReports = async () => {
      setIsFetchingReports(true);
      try {
        if (user) {
          console.log("[ReportsPage] Fetching reports for authenticated user:", user.uid);
          const firestoreReports = await getAuthenticatedUserReportsFromFirestore(user.uid);
          setReports(firestoreReports);
        } else {
          console.log("[ReportsPage] Fetching reports for anonymous user.");
          setReports(getAnonymousReports());
        }
      } catch (error: any) {
        console.error("Error fetching reports:", error);
        toast({
          variant: "destructive",
          title: "Failed to load reports",
          description: error.message || "Could not retrieve your reports at this time.",
        });
        setReports([]); // Clear reports on error
      } finally {
        setIsFetchingReports(false);
      }
    };

    fetchReports();
  }, [isMounted, user, authLoading, toast]);

  if (!isMounted || authLoading || isFetchingReports) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Loading user session..." : "Loading reports..."}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center gap-3">
          <BarChart3 className="w-10 h-10" />
          Call & Stress Reports
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Review your past call and on-demand stress analyses.
        </p>
      </header>

      {reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Dialog key={report.id} onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedReport(null);
            }}>
              <DialogTrigger asChild onClick={() => setSelectedReport(report)}>
                <div> 
                  <ReportCard report={report} />
                </div>
              </DialogTrigger>
              {selectedReport && selectedReport.id === report.id && (
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      Report for: {report.contactName || report.contactNumber}
                    </DialogTitle>
                    <DialogDescription>
                      {report.contactName === "On-Demand Stress Check" ? "On-Demand Analysis" : `Call on ${new Date(report.timestamp).toLocaleDateString()} at ${new Date(report.timestamp).toLocaleTimeString()}`}
                      {report.contactName !== "On-Demand Stress Check" && report.callDuration && report.callDuration !== "N/A" && ` | Duration: ${report.callDuration}`}
                    </DialogDescription>
                  </DialogHeader>
                  {report.stressAnalysis ? (
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                         <StressChart stressLevel={report.stressAnalysis.stressLevel} />
                         <div className="text-center">
                            <p className="text-5xl font-bold text-primary">{report.stressAnalysis.stressLevel}%</p>
                            <p className="text-sm text-muted-foreground">Stress Level</p>
                         </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Analysis Details:</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {report.stressAnalysis.analysisDetails}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Analysis performed on: {new Date(report.stressAnalysis.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground">
                      <Info className="w-12 h-12 mx-auto mb-2" />
                      No stress analysis available for this record.
                    </div>
                  )}
                </DialogContent>
              )}
            </Dialog>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-card rounded-lg shadow-md p-8">
          <BarChart3 className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No reports available yet.</p>
          <p className="text-sm text-muted-foreground">
            {user ? "Complete a stress check or a call to see reports here." : "Complete a stress check to see reports here."}
          </p>
        </div>
      )}
    </div>
  );
}
