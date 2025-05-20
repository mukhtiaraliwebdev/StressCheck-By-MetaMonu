
"use client";

import type { CallReport, StressAnalysisResult } from "./types";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp as firestoreServerTimestamp, doc, setDoc } from "firebase/firestore";


const ANONYMOUS_REPORTS_STORAGE_KEY = "stressCallAnonymousReports";
const ANONYMOUS_CHECKS_COUNT_KEY = "anonymousStressChecksCount";
export const MAX_ANONYMOUS_CHECKS = 5;

function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// --- Anonymous User LocalStorage Functions ---

export function getAnonymousChecksUsed(): number {
  if (typeof window === "undefined") return 0;
  const count = localStorage.getItem(ANONYMOUS_CHECKS_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

export function incrementAnonymousChecksUsed(): number {
  if (typeof window === "undefined") return getAnonymousChecksUsed();
  let count = getAnonymousChecksUsed();
  count++;
  localStorage.setItem(ANONYMOUS_CHECKS_COUNT_KEY, count.toString());
  return count;
}

export function getAnonymousReports(): CallReport[] {
  if (typeof window === "undefined") {
    return [];
  }
  const storedReports = localStorage.getItem(ANONYMOUS_REPORTS_STORAGE_KEY);
  if (storedReports) {
    try {
      const parsedReports = JSON.parse(storedReports) as CallReport[];
      return parsedReports.map(report => ({
        ...report,
        timestamp: new Date(report.timestamp), // Ensure Date object
        stressAnalysis: report.stressAnalysis ? {
          ...report.stressAnalysis,
          timestamp: new Date(report.stressAnalysis.timestamp), // Ensure Date object
        } : undefined,
      }));
    } catch (error) {
      console.error("Error parsing anonymous reports from localStorage:", error);
      return [];
    }
  }
  return [];
}

export function saveAnonymousStressCheckReport(analysisResult: StressAnalysisResult): CallReport {
   if (typeof window === "undefined") {
    console.warn("Attempted to save anonymous report from non-browser environment");
    // Return a mock report for SSR or non-browser contexts if necessary, though this path shouldn't be hit often.
    const mockSavedReport: CallReport = {
      id: generateUniqueId(),
      contactName: "On-Demand Stress Check (Anonymous Server)",
      contactNumber: new Date(analysisResult.timestamp).toLocaleString(),
      callDuration: "N/A",
      stressAnalysis: analysisResult,
      timestamp: new Date(),
    };
    return mockSavedReport;
  }
  const reports = getAnonymousReports();
  const newReport: CallReport = {
    id: generateUniqueId(),
    contactName: "On-Demand Stress Check",
    contactNumber: new Date(analysisResult.timestamp).toLocaleString(), 
    callDuration: "N/A",
    stressAnalysis: analysisResult,
    timestamp: new Date(), // Main report timestamp
  };
  reports.unshift(newReport); 
  localStorage.setItem(ANONYMOUS_REPORTS_STORAGE_KEY, JSON.stringify(reports));
  return newReport;
}

// --- Authenticated User Firestore Functions ---

// Saves a stress check report for an authenticated user to Firestore
export async function saveAuthenticatedUserReportToFirestore(
  userId: string,
  reportData: Omit<CallReport, 'id' | 'timestamp'> & { stressAnalysis: StressAnalysisResult }
): Promise<CallReport> {
  const reportId = generateUniqueId();
  const reportRef = doc(db, `users/${userId}/reports`, reportId);
  
  const newReportForFirestore = {
    ...reportData,
    stressAnalysis: {
      ...reportData.stressAnalysis,
      timestamp: Timestamp.fromDate(reportData.stressAnalysis.timestamp), // Convert JS Date to Firestore Timestamp
    },
    timestamp: firestoreServerTimestamp(), // Use Firestore server timestamp for the main report
  };

  await setDoc(reportRef, newReportForFirestore);
  
  return {
    ...reportData,
    id: reportId,
    timestamp: new Date(), // For client-side immediate use, reflect server timestamp approximately
  };
}

// Gets reports for an authenticated user from Firestore
export async function getAuthenticatedUserReportsFromFirestore(userId: string): Promise<CallReport[]> {
  if (!userId) return [];
  const reportsColRef = collection(db, `users/${userId}/reports`);
  // Order by timestamp descending to get newest reports first
  const q = query(reportsColRef, orderBy("timestamp", "desc")); 
  
  const querySnapshot = await getDocs(q);
  const reports: CallReport[] = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    reports.push({
      id: docSnap.id,
      contactName: data.contactName,
      contactNumber: data.contactNumber,
      callDuration: data.callDuration,
      stressAnalysis: data.stressAnalysis ? {
        ...data.stressAnalysis,
        // Convert Firestore Timestamp back to JS Date
        timestamp: (data.stressAnalysis.timestamp as Timestamp).toDate(), 
      } : undefined,
      // Convert Firestore Timestamp back to JS Date
      timestamp: (data.timestamp as Timestamp).toDate(), 
    });
  });
  return reports;
}


// ---- TEMPORARY LocalStorage functions for Authenticated Users (to be replaced by Firestore) ---
// These are kept temporarily to avoid breaking existing flows if Firestore migration is partial
// And to allow for a phased rollout. Eventually, these should be removed.

export function saveAuthenticatedUserStressCheckReportToLocalStorage(userId: string, analysisResult: StressAnalysisResult): CallReport {
  console.warn(`[TEMPORARY] Saving report for user ${userId} to localStorage. This should migrate to Firestore.`);
  const userSpecificStorageKey = `${ANONYMOUS_REPORTS_STORAGE_KEY}_${userId}`;
  let reports: CallReport[] = [];
  if (typeof window !== "undefined") {
    const storedUserReports = localStorage.getItem(userSpecificStorageKey);
    if (storedUserReports) {
      try {
        reports = JSON.parse(storedUserReports);
      } catch (e) { console.error("Error parsing user reports from localStorage", e); }
    }
  }

  const newReport: CallReport = {
    id: generateUniqueId(),
    contactName: "On-Demand Stress Check",
    contactNumber: new Date(analysisResult.timestamp).toLocaleString(),
    callDuration: "N/A",
    stressAnalysis: analysisResult,
    timestamp: new Date(),
  };
  reports.unshift(newReport);
  if (typeof window !== "undefined") {
    localStorage.setItem(userSpecificStorageKey, JSON.stringify(reports));
  }
  return newReport;
}

export function getAuthenticatedUserReportsFromLocalStorage(userId: string): CallReport[] {
  console.warn(`[TEMPORARY] Fetching reports for user ${userId} from localStorage. This should migrate to Firestore.`);
  if (typeof window === "undefined") return [];
  const userSpecificStorageKey = `${ANONYMOUS_REPORTS_STORAGE_KEY}_${userId}`;
  const storedUserReports = localStorage.getItem(userSpecificStorageKey);
  if (storedUserReports) {
    try {
      const parsedReports = JSON.parse(storedUserReports) as CallReport[];
      return parsedReports.map(report => ({
        ...report,
        timestamp: new Date(report.timestamp),
        stressAnalysis: report.stressAnalysis ? {
          ...report.stressAnalysis,
          timestamp: new Date(report.stressAnalysis.timestamp),
        } : undefined,
      }));
    } catch (error) {
      console.error("Error parsing user reports from localStorage:", error);
      return [];
    }
  }
  return [];
}
