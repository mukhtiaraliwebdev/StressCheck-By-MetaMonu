"use client";

import { useState, useEffect, useCallback } from "react";
import { VoiceRecorder } from "@/components/stress/VoiceRecorder";
import { StressChart } from "@/components/stress/StressChart";
import { performStressAnalysis } from "@/lib/actions/stressActions";
import { 
  saveAnonymousStressCheckReport, 
  getAnonymousChecksUsed, 
  incrementAnonymousChecksUsed,
  MAX_ANONYMOUS_CHECKS,
  saveAuthenticatedUserReportToFirestore // Use Firestore for authenticated users
} from "@/lib/reportStore"; 
import type { StressAnalysisResult, CallReport } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Smile, Meh, Frown, Mic as MicIcon, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export const MAX_AUTH_FREE_CHECKS = 30;

const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export default function StressCheckPage() {
  const [analysisResult, setAnalysisResult] = useState<StressAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [canPerformCheck, setCanPerformCheck] = useState(false);
  const [checksRemaining, setChecksRemaining] = useState<number | string>("...");
  const [isPageLoading, setIsPageLoading] = useState(true); 
  
  const { toast } = useToast();
  const { user, loading: authLoading, updateUserStressProfile, refreshUser } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setIsPageLoading(true); 

    if (authLoading) {
      setChecksRemaining("...");
      setCanPerformCheck(false);
      return; 
    }

    if (user) {
      let { monthlyStressChecksUsed = 0, lastResetDate, subscriptionTier } = user;
      
      const currentDate = new Date();
      const clientLastResetDate = lastResetDate instanceof Date ? lastResetDate : new Date(0); 

      const lastResetMonth = clientLastResetDate.getMonth();
      const currentMonth = currentDate.getMonth();
      const lastResetYear = clientLastResetDate.getFullYear();
      const currentYear = currentDate.getFullYear();

      if (currentYear > lastResetYear || (currentYear === lastResetYear && currentMonth > lastResetMonth)) {
        console.log("Resetting monthly checks for user:", user.uid);
        updateUserStressProfile({ monthlyStressChecksUsed: 0, lastResetDate: new Date() })
          .then(refreshUser) // Refresh user to get the updated profile from AuthContext
          .then(() => {
            toast({ title: "Monthly Checks Reset", description: `Your ${MAX_AUTH_FREE_CHECKS} stress checks for the month are available.`});
            // The useEffect will re-run with updated user from refreshUser, recalculating checks.
            // setIsPageLoading(false) will be handled in the subsequent run.
          })
          .catch(err => {
            console.error("Error resetting monthly checks:", err);
            setPageError(err.message || "Could not reset monthly checks. Please try again later.");
            const limit = subscriptionTier === 'premium' ? Infinity : MAX_AUTH_FREE_CHECKS;
            const remaining = limit === Infinity ? "Unlimited" : Math.max(0, limit - (user.monthlyStressChecksUsed || 0));
            setChecksRemaining(remaining);
            setCanPerformCheck(limit === Infinity || (user.monthlyStressChecksUsed || 0) < limit);
            setIsPageLoading(false);
          });
      } else {
        const limit = subscriptionTier === 'premium' ? Infinity : MAX_AUTH_FREE_CHECKS;
        const remaining = limit === Infinity ? "Unlimited" : Math.max(0, limit - monthlyStressChecksUsed);
        setChecksRemaining(remaining);
        setCanPerformCheck(limit === Infinity || monthlyStressChecksUsed < limit);
        setIsPageLoading(false);
      }
    } else {
      const checksUsed = getAnonymousChecksUsed();
      const remaining = Math.max(0, MAX_ANONYMOUS_CHECKS - checksUsed);
      setChecksRemaining(remaining);
      setCanPerformCheck(checksUsed < MAX_ANONYMOUS_CHECKS);
      setIsPageLoading(false);
    }
  }, [user, authLoading, isMounted, updateUserStressProfile, refreshUser, toast]);


  const handleRecordingComplete = async (base64Data: string, mimeType: string) => {
    if (isPageLoading || !canPerformCheck ) {
      toast({
        variant: "destructive",
        title: "Limit Reached or Page Not Ready",
        description: user ? "You have reached your stress check limit for this month or the page is still loading." : "You have reached your free stress check limit or the page is still loading.",
      });
      return;
    }

    setIsAnalyzing(true);
    setPageError(null);
    setAnalysisResult(null);

    try {
      const result = await performStressAnalysis(base64Data, mimeType);

      if ("error" in result) {
        setPageError(result.error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: result.error,
        });
      } else {
        setAnalysisResult(result);
        if (user) {
          // Save report to Firestore for authenticated user
          const reportToSave: Omit<CallReport, 'id' | 'timestamp'> & { stressAnalysis: StressAnalysisResult } = {
            contactName: "On-Demand Stress Check",
            contactNumber: new Date(result.timestamp).toLocaleString(), // Using analysis timestamp as identifier
            callDuration: "N/A",
            stressAnalysis: result,
          };
          await saveAuthenticatedUserReportToFirestore(user.uid, reportToSave);
          
          const newCount = (user.monthlyStressChecksUsed || 0) + 1;
          await updateUserStressProfile({ monthlyStressChecksUsed: newCount });
          // AuthContext will update the user object, and the useEffect will recalculate checksRemaining via refreshUser
          toast({
            title: "Analysis Complete & Saved",
            description: `Stress level: ${result.stressLevel}%. Report saved.`,
          });
        } else {
          saveAnonymousStressCheckReport(result);
          const newChecksUsed = incrementAnonymousChecksUsed();
          const remaining = Math.max(0, MAX_ANONYMOUS_CHECKS - newChecksUsed);
          setChecksRemaining(remaining);
          setCanPerformCheck(newChecksUsed < MAX_ANONYMOUS_CHECKS);
          toast({
            title: "Analysis Complete & Saved (Locally)",
            description: `Stress level: ${result.stressLevel}%. Report saved.`,
          });
        }
      }
    } catch (e: any) {
      console.error("Error during stress analysis process:", e);
      const errorMsg = e.message || "An unexpected error occurred during analysis."
      setPageError(errorMsg);
      toast({ variant: "destructive", title: "Analysis Error", description: errorMsg});
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStressIcon = (level: number) => {
    if (level < 30) return <Smile className="w-12 h-12 text-green-500" />;
    if (level < 70) return <Meh className="w-12 h-12 text-yellow-500" />;
    return <Frown className="w-12 h-12 text-red-500" />;
  }

  if (isPageLoading) { 
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
        <p className="text-lg text-muted-foreground mt-4">Loading stress check status...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary">On-Demand Stress Check</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Record your voice and get an instant stress analysis.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Checks remaining: <span className="font-semibold text-primary">{checksRemaining}</span>
          {user && user.subscriptionTier === 'free' && (
            (typeof checksRemaining === 'number' ? " this month" : (checksRemaining !== "Unlimited" ? " this month" : null))
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <VoiceRecorder 
          onRecordingComplete={handleRecordingComplete} 
          isAnalyzing={isAnalyzing} 
          disabled={!canPerformCheck || isAnalyzing} 
        />
        
        <div className="space-y-6">
          {isAnalyzing && (
            <Card className="flex flex-col items-center justify-center p-10 shadow-md">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Analyzing your voice, please wait...</p>
            </Card>
          )}

          {pageError && !isAnalyzing && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          )}

          {!canPerformCheck && !isAnalyzing && (
            <Card className="p-10 text-center shadow-md">
              <Info className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl mb-2">Limit Reached</CardTitle>
              <CardDescription>
                {user 
                  ? "You have used all your stress checks for this month." 
                  : "You have used all your free stress checks."}
                {!user && (
                  <>
                    {" "}Please <Link href="/signup" className="text-primary hover:underline">sign up</Link> or <Link href="/login" className="text-primary hover:underline">log in</Link> for more.
                  </>
                )}
                 {user && user.subscriptionTier === 'free' && (
                   <>
                    {" "}Consider upgrading for unlimited checks. {/* Placeholder for upgrade link */}
                   </>
                 )}
              </CardDescription>
            </Card>
          )}

          {analysisResult && !isAnalyzing && (
            <>
              <Card className="shadow-lg">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    {getStressIcon(analysisResult.stressLevel)}
                  </div>
                  <CardTitle className="text-3xl">Analysis Complete</CardTitle>
                  <CardDescription>
                    Your estimated stress level is{" "}
                    <span className="font-bold text-primary">{analysisResult.stressLevel}%</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4"><strong>Details:</strong> {analysisResult.analysisDetails}</p>
                  <p className="text-xs text-muted-foreground">Analyzed on: {new Date(analysisResult.timestamp).toLocaleString()}</p>
                </CardContent>
              </Card>
              <StressChart stressLevel={analysisResult.stressLevel} />
            </>
          )}
          {canPerformCheck && !isAnalyzing && !analysisResult && !pageError && (
             <Card className="p-10 text-center shadow-md">
                <MicIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Record and submit your voice to see your stress analysis results.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
