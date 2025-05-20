
"use client";

import type { CallReport } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StressChart } from "@/components/stress/StressChart"; 

interface ReportCardProps {
  report: CallReport;
  // onClick?: () => void; // Removed onClick as DialogTrigger will handle it
}

export function ReportCard({ report }: ReportCardProps) {
  const getStressBadgeVariant = (level: number): "default" | "destructive" | "secondary" => {
    if (level > 70) return "destructive";
    if (level < 30) return "secondary"; 
    return "default"; 
  };
  
  const getStressBadgeText = (level: number): string => {
    if (level > 70) return "High Stress";
    if (level < 30) return "Low Stress";
    return "Moderate Stress";
  };

  const isStressCheck = report.contactName === "On-Demand Stress Check";

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {isStressCheck ? (
              <AvatarFallback><Activity /></AvatarFallback>
            ) : (
              <>
                <AvatarImage 
                  src={`https://placehold.co/48x48.png?text=${report.contactName ? report.contactName.substring(0,1) : report.contactNumber.substring(0,1)}`} 
                  alt={report.contactName || "User"}
                  data-ai-hint="person avatar"
                />
                <AvatarFallback>
                  {report.contactName ? report.contactName.substring(0, 2).toUpperCase() : <User />}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-xl">{report.contactName || report.contactNumber}</CardTitle>
            {!isStressCheck && report.contactName && <CardDescription>{report.contactNumber}</CardDescription>}
            {isStressCheck && <CardDescription>Analysis Time: {report.contactNumber}</CardDescription>}
          </div>
        </div>
        {report.stressAnalysis && (
          <Badge variant={getStressBadgeVariant(report.stressAnalysis.stressLevel)}>
            {getStressBadgeText(report.stressAnalysis.stressLevel)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        {!isStressCheck && report.callDuration !== "N/A" && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>Call Duration: {report.callDuration}</span>
          </div>
        )}
        {report.stressAnalysis && (
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Activity className="mr-2 h-4 w-4 text-primary" />
              <span>Average Stress: {report.stressAnalysis.stressLevel}%</span>
            </div>
            <p className="text-xs text-muted-foreground pl-6 line-clamp-2">
              {report.stressAnalysis.analysisDetails}
            </p>
            <div className="h-20 mt-2"> 
               <StressChart stressLevel={report.stressAnalysis.stressLevel} />
            </div>
          </div>
        )}
        {!report.stressAnalysis && (
          <p className="text-sm text-muted-foreground">No stress analysis available for this record.</p>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          {isStressCheck ? "Analysis" : "Call"} on: {new Date(report.timestamp).toLocaleDateString()} at {new Date(report.timestamp).toLocaleTimeString()}
        </p>
      </CardFooter>
    </Card>
  );
}
