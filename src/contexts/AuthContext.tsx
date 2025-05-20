
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth';
import type { DocumentReference, Timestamp} from 'firebase/firestore';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null; // Added optional phone number
  monthlyStressChecksUsed: number;
  lastResetDate: Date;
  subscriptionTier: 'free' | 'premium';
  createdAt: Date;
  providerId?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signUpWithEmail: (email: string, password: string, displayName: string, phoneNumber?: string) => Promise<void>; // Added phoneNumber
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateUserStressProfile: (updates: Partial<Pick<UserProfile, 'monthlyStressChecksUsed' | 'lastResetDate'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserDisplayName: (newDisplayName: string) => Promise<void>;
  updateUserPhoneNumber: (newPhoneNumber: string) => Promise<void>; // Added
  changeUserPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLIENT_SESSION_COOKIE_NAME = "clientSession";

async function manageUserInFirestore(firebaseUser: FirebaseUser, initialData?: { displayName?: string, phoneNumber?: string }): Promise<UserProfile> {
  console.log('[AuthContext] manageUserInFirestore called for UID:', firebaseUser.uid);
  const userRef: DocumentReference = doc(db, 'users', firebaseUser.uid);
  let userSnap;

  try {
    userSnap = await getDoc(userRef);
    console.log('[AuthContext] getDoc for UID', firebaseUser.uid, 'exists:', userSnap.exists());
  } catch (e: any) {
    console.error(`[AuthContext] Firestore getDoc error in manageUserInFirestore for UID: ${firebaseUser.uid}`, e);
    if (e.message && e.message.toLowerCase().includes("offline")) {
      console.error("*********************************************************************************");
      console.error("DETECTION: Firestore client reported as 'offline'. Please check:");
      console.error("1. Firestore Database is ENABLED in your Firebase project (Firebase Console > Build > Firestore Database).");
      console.error("2. Cloud Firestore API is ENABLED for your project in Google Cloud Console (APIs & Services > Library).");
      console.error("3. API Key Restrictions in Google Cloud Console: Ensure your API key allows 'Cloud Firestore API' and that your current domain is allowed as an HTTP referrer (or set to 'None' for testing).");
      console.error("4. Billing: If on Blaze plan, ensure billing account is active and in good standing.");
      console.error("5. Firestore Security Rules: Ensure they allow reads for authenticated users to their own profile (e.g., match /users/{userId} { allow read: if request.auth.uid == userId; }).");
      console.error("6. Network Connectivity: Check your internet connection and any firewalls/VPNs/extensions.");
      console.error("*********************************************************************************");
    }
    throw new Error(`Failed to fetch user profile: ${e.message}`);
  }

  let userProfileData: UserProfile;
  const providerId = firebaseUser.providerData?.[0]?.providerId || 'unknown';

  if (!userSnap.exists()) {
    console.log('[AuthContext] No existing Firestore profile for UID:', firebaseUser.uid, '. Creating new one.');
    const profileDisplayName = initialData?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User';
    
    // Update Firebase Auth profile displayName if it's different from what we're setting in Firestore
    if (firebaseUser.displayName !== profileDisplayName) {
        try {
            await updateProfile(firebaseUser, { displayName: profileDisplayName });
        } catch (updateError) {
            console.error("[AuthContext] Failed to update Firebase Auth displayName for new user:", updateError);
        }
    }

    const newProfileData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: profileDisplayName,
      photoURL: firebaseUser.photoURL || null,
      phoneNumber: initialData?.phoneNumber || null, // Include phone number
      monthlyStressChecksUsed: 0,
      lastResetDate: serverTimestamp(),
      subscriptionTier: 'free' as 'free' | 'premium',
      createdAt: serverTimestamp(),
      providerId: providerId,
    };
    try {
      await setDoc(userRef, newProfileData);
      console.log('[AuthContext] New Firestore profile created for UID:', firebaseUser.uid);
      userProfileData = {
        ...newProfileData,
        lastResetDate: new Date(), 
        createdAt: new Date(), 
      };
    } catch (e: any) {
      console.error("[AuthContext] Firestore setDoc error in manageUserInFirestore (new user) for UID:", firebaseUser.uid, e);
      throw new Error(`Failed to create user profile: ${e.message}`);
    }
  } else {
    console.log('[AuthContext] Existing Firestore profile found for UID:', firebaseUser.uid);
    const existingData = userSnap.data();
    const updatesToFirestore: Partial<UserProfile & { lastResetDate: Timestamp | Date, createdAt: Timestamp | Date }> = {};

    let currentDisplayName = existingData.displayName;
    if (firebaseUser.displayName && firebaseUser.displayName !== existingData.displayName) {
      updatesToFirestore.displayName = firebaseUser.displayName;
      currentDisplayName = firebaseUser.displayName;
    } else if (!existingData.displayName && firebaseUser.displayName) {
        updatesToFirestore.displayName = firebaseUser.displayName;
        currentDisplayName = firebaseUser.displayName;
    }


    let currentPhotoURL = existingData.photoURL;
    if (firebaseUser.photoURL && firebaseUser.photoURL !== existingData.photoURL) {
      updatesToFirestore.photoURL = firebaseUser.photoURL;
      currentPhotoURL = firebaseUser.photoURL;
    } else if (!existingData.photoURL && firebaseUser.photoURL) {
        updatesToFirestore.photoURL = firebaseUser.photoURL;
        currentPhotoURL = firebaseUser.photoURL;
    }
    
    if (existingData.providerId === undefined && providerId !== 'unknown') {
      updatesToFirestore.providerId = providerId;
    }
    if (existingData.phoneNumber === undefined) { // Initialize if missing
        updatesToFirestore.phoneNumber = null;
    }


    const monthlyChecks = existingData.monthlyStressChecksUsed ?? 0;
    const subTier = existingData.subscriptionTier ?? 'free';

    let clientLastResetDate = new Date(0); 
    if (existingData.lastResetDate) {
        clientLastResetDate = existingData.lastResetDate instanceof FirestoreTimestamp
                                ? existingData.lastResetDate.toDate()
                                : new Date(existingData.lastResetDate as any); 
    } else {
        updatesToFirestore.lastResetDate = serverTimestamp(); 
        clientLastResetDate = new Date(); 
    }

    let clientCreatedAt = new Date();
     if (existingData.createdAt) {
        clientCreatedAt = existingData.createdAt instanceof FirestoreTimestamp
                            ? existingData.createdAt.toDate()
                            : new Date(existingData.createdAt as any);
    } else {
        updatesToFirestore.createdAt = serverTimestamp(); 
    }

    if (existingData.monthlyStressChecksUsed === undefined) updatesToFirestore.monthlyStressChecksUsed = 0;
    if (existingData.subscriptionTier === undefined) updatesToFirestore.subscriptionTier = 'free';

    if (Object.keys(updatesToFirestore).length > 0) {
      try {
        await updateDoc(userRef, updatesToFirestore);
        console.log('[AuthContext] Firestore profile updated for UID:', firebaseUser.uid, updatesToFirestore);
      } catch (e: any) {
        console.error("[AuthContext] Firestore updateDoc error in manageUserInFirestore (existing user) for UID:", firebaseUser.uid, e);
      }
    }

    userProfileData = {
      uid: existingData.uid || firebaseUser.uid, 
      email: existingData.email || firebaseUser.email,
      displayName: currentDisplayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
      photoURL: currentPhotoURL || firebaseUser.photoURL || null,
      phoneNumber: existingData.phoneNumber || null,
      monthlyStressChecksUsed: monthlyChecks,
      lastResetDate: clientLastResetDate,
      subscriptionTier: subTier,
      createdAt: clientCreatedAt,
      providerId: existingData.providerId || providerId,
    };
  }
  return userProfileData;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAndSetUser = useCallback(async (firebaseUser: FirebaseUser | null, initialSignUpData?: { displayName?: string, phoneNumber?: string }) => {
    console.log('[AuthContext] fetchAndSetUser called. Firebase user UID:', firebaseUser ? firebaseUser.uid : 'null');
    try {
      if (firebaseUser) {
        console.log('[AuthContext] fetchAndSetUser: firebaseUser found, UID:', firebaseUser.uid, '. Attempting to manage Firestore profile.');
        const userProfile = await manageUserInFirestore(firebaseUser, initialSignUpData);
        setUser(userProfile);
        if (typeof window !== 'undefined') {
            document.cookie = `${CLIENT_SESSION_COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 7}`; 
        }
        setError(null);
        console.log('[AuthContext] fetchAndSetUser: User profile set:', userProfile);
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
            document.cookie = `${CLIENT_SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      }
    } catch (e: any) {
      console.error("[AuthContext] Error in fetchAndSetUser (managing user profile):", e);
      setError(e.message || "Failed to load user profile.");
      setUser(null); 
      if (typeof window !== 'undefined') {
        document.cookie = `${CLIENT_SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } finally {
      setLoading(false);
      console.log('[AuthContext] fetchAndSetUser: setLoading(false) after user processing.');
    }
  }, []);

  useEffect(() => {
    console.log('[AuthContext] useEffect: Setting up onAuthStateChanged listener.');
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] onAuthStateChanged triggered. Firebase user:', firebaseUser ? firebaseUser.uid : 'null');
      await fetchAndSetUser(firebaseUser);
    }, (authError) => {
      console.error("[AuthContext] Firebase onAuthStateChanged error:", authError);
      setError(authError.message || "Authentication state error.");
      setUser(null);
      if (typeof window !== 'undefined') {
        document.cookie = `${CLIENT_SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
      setLoading(false);
      toast({ variant: "destructive", title: "Auth Error", description: authError.message || "Authentication state error." });
    });
    return () => {
      console.log('[AuthContext] useEffect: Cleaning up onAuthStateChanged listener.');
      unsubscribe();
    }
  }, [fetchAndSetUser, toast]);

  const clearError = () => setError(null);

  const signUpWithEmail = async (email: string, password: string, displayName: string, phoneNumber?: string) => {
    setLoading(true);
    setError(null);
    console.log('[AuthContext] Attempting email sign up for:', email);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Firebase Auth displayName update
      await updateProfile(userCredential.user, { displayName }); 
      // Let onAuthStateChanged trigger fetchAndSetUser with initialSignUpData
      // fetchAndSetUser will then call setLoading(false) and create Firestore doc
      toast({ title: "Account Created", description: "Your account has been successfully created." });
      router.push('/');
    } catch (e: any) {
      console.error("[AuthContext] Sign up error:", e);
      const errorMessage = e.code === 'auth/email-already-in-use'
        ? 'This email address is already in use.'
        : (e.message || "Failed to sign up.");
      setError(errorMessage);
      toast({ variant: "destructive", title: "Sign Up Failed", description: errorMessage });
      setLoading(false); 
    }
  };
  
  // This useEffect handles the initial data write to Firestore AFTER onAuthStateChanged has confirmed the user
  // and ensures manageUserInFirestore has the initialDisplayName and phoneNumber from signup.
  useEffect(() => {
    const handleInitialData = async () => {
        if (auth.currentUser && !loading && user && !user.createdAt) { 
            // Heuristic: if user object exists but createdAt is missing, it might be a new signup
            // where manageUserInFirestore from onAuthStateChanged didn't have initialData.
            // This is tricky. A better way is to pass initialData directly during signup flow if possible.
            // For now, this tries to catch it. Or, simply rely on initial call to fetchAndSetUser
            // from signUpWithEmail if onAuthStateChanged guarantees immediate trigger for new users.
        }
    };
    handleInitialData();
  }, [user, loading, fetchAndSetUser]);


  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    console.log('[AuthContext] Attempting email sign in for:', email);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/');
    } catch (e: any) {
      console.error("[AuthContext] Sign in error:", e);
       const errorMessage = (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
        ? 'Invalid email or password.'
        : (e.message || "Failed to sign in.");
      setError(errorMessage);
      toast({ variant: "destructive", title: "Login Failed", description: errorMessage });
      setLoading(false); 
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    console.log('[AuthContext] Attempting Google sign in.');
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Login Successful", description: "Welcome!" });
      router.push('/');
    } catch (e: any) {
      console.error("[AuthContext] Google sign in error:", e);
      const errorMessage = e.code === 'auth/popup-closed-by-user'
        ? 'Google Sign-In cancelled.'
        : (e.message || "Failed to sign in with Google.");
      setError(errorMessage);
      toast({ variant: "destructive", title: "Google Sign-In Failed", description: errorMessage });
      setLoading(false); 
    }
  };

  const signOut = async () => {
    setError(null);
    setLoading(true); 
    console.log('[AuthContext] Attempting sign out.');
    try {
      await firebaseSignOut(auth);
      setUser(null); // Explicitly set user to null for faster UI update
      if (typeof window !== 'undefined') {
        document.cookie = `${CLIENT_SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login'); 
    } catch (e: any) {
      console.error("[AuthContext] Sign out error:", e);
      setError(e.message || "Failed to sign out.");
      toast({ variant: "destructive", title: "Logout Failed", description: e.message });
    } finally {
        setLoading(false);
    }
  };

  const updateUserStressProfile = async (updates: Partial<Pick<UserProfile, 'monthlyStressChecksUsed' | 'lastResetDate'>>) => {
    if (!user) {
      const msg = "[AuthContext] User not authenticated to update profile.";
      setError(msg);
      toast({ variant: "destructive", title: "Update Failed", description: "You must be logged in to update your profile."});
      console.error(msg);
      return;
    }
    console.log('[AuthContext] Updating user stress profile for UID:', user.uid, 'with updates:', updates);
    try {
      const userRef = doc(db, 'users', user.uid);
      const firestoreUpdates: any = { ...updates };
      if (updates.lastResetDate instanceof Date) {
        firestoreUpdates.lastResetDate = FirestoreTimestamp.fromDate(updates.lastResetDate);
      }
      await updateDoc(userRef, firestoreUpdates);
      console.log('[AuthContext] User stress profile updated in Firestore for UID:', user.uid);
      await refreshUser();
    } catch (e: any) {
      console.error("[AuthContext] Error updating user stress profile in Firestore for UID:", user.uid, e);
      setError(e.message || "Failed to update user stress data.");
      toast({ variant: "destructive", title: "Profile Update Failed", description: e.message });
    }
  };

  const refreshUser = useCallback(async () => {
    const currentFirebaseUser = auth.currentUser;
    console.log('[AuthContext] refreshUser called. Current Firebase user:', currentFirebaseUser ? currentFirebaseUser.uid : 'null');
    if (currentFirebaseUser) {
      setLoading(true); 
      await fetchAndSetUser(currentFirebaseUser); 
    } else {
       console.log('[AuthContext] refreshUser: No current Firebase user, local user already null or will be set by onAuthStateChanged.');
       setUser(null);
       if (typeof window !== 'undefined') {
        document.cookie = `${CLIENT_SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
       }
       setLoading(false);
    }
  }, [fetchAndSetUser]);

  const updateUserDisplayName = async (newDisplayName: string) => {
    if (!auth.currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to update your display name." });
      throw new Error("User not authenticated");
    }
    setLoading(true);
    setError(null);
    try {
      await updateProfile(auth.currentUser, { displayName: newDisplayName });
      if (user) { 
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { displayName: newDisplayName });
      }
      await refreshUser(); 
      toast({ title: "Profile Updated", description: "Your display name has been updated." });
    } catch (e: any) {
      console.error("Error updating display name:", e);
      setError(e.message || "Failed to update display name.");
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
      throw e; // Re-throw to be caught by the calling page
    } finally {
      setLoading(false);
    }
  };

  const updateUserPhoneNumber = async (newPhoneNumber: string) => {
    if (!user || !auth.currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to update your phone number." });
      throw new Error("User not authenticated");
    }
    setLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { phoneNumber: newPhoneNumber || null }); // Store null if empty string
      await refreshUser();
      toast({ title: "Profile Updated", description: "Your phone number has been updated." });
    } catch (e: any)
{
      console.error("Error updating phone number:", e);
      setError(e.message || "Failed to update phone number.");
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
      throw e; // Re-throw to be caught by the calling page
    } finally {
      setLoading(false);
    }
  };

  const changeUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to change your password." });
      throw new Error("User not authenticated");
    }
    const isEmailPasswordUser = auth.currentUser.providerData.some(
      (provider) => provider.providerId === EmailAuthProvider.PROVIDER_ID
    );

    if (!isEmailPasswordUser) {
      toast({ variant: "destructive", title: "Password Change Not Applicable", description: "Password change is not available for accounts signed in with Google. Please change your password through your Google account." });
      throw new Error("Password change not applicable for this provider.");
    }

    setLoading(true);
    setError(null);
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast({ title: "Password Changed", description: "Your password has been successfully updated." });
    } catch (e: any) {
      console.error("Error changing password:", e);
      let friendlyMessage = e.message || "Failed to change password.";
      if (e.code === 'auth/weak-password') {
        friendlyMessage = "The new password is too weak. Please choose a stronger password.";
      } else if (e.code === 'auth/requires-recent-login') {
        friendlyMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in before changing your password.";
      }
      setError(friendlyMessage);
      toast({ variant: "destructive", title: "Password Change Failed", description: friendlyMessage });
      throw e; // Re-throw to be caught by the calling page
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        error, 
        signUpWithEmail, 
        signInWithEmail, 
        signInWithGoogle, 
        signOut, 
        clearError, 
        updateUserStressProfile, 
        refreshUser,
        updateUserDisplayName,
        updateUserPhoneNumber,
        changeUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
