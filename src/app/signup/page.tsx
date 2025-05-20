
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent} from 'react';
import { useEffect, useState } from "react";

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); // New state for phone number
  const { signUpWithEmail, signInWithGoogle, loading: authIsLoading, error: authErrorHook, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false); 

  useEffect(() => {
    if (user && !authIsLoading) {
      console.log("[SignUpPage] User detected, auth not loading, redirecting to /");
      router.push('/');
    }
  }, [user, authIsLoading, router]);


  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password || !confirmPassword) {
        toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all required fields." });
        return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Password Mismatch", description: "Passwords do not match." });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Weak Password", description: "Password should be at least 6 characters long." });
      return;
    }
    // Basic phone validation (optional) - allowing empty or simple format
    if (phoneNumber && !/^[+]?[0-9\s-()]*$/.test(phoneNumber)) {
        toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please enter a valid phone number or leave it empty." });
        return;
    }
    setIsSubmitting(true);
    await signUpWithEmail(email, password, displayName, phoneNumber || undefined); // Pass phone number
    setIsSubmitting(false);
  };

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    setIsSubmitting(false);
  };

  if (authIsLoading) {
    return (
        <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <p className="mt-4 text-muted-foreground">Loading session...</p>
        </div>
    );
  }

  if (!authIsLoading && user) {
    return (
        <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirecting to homepage...</p>
        </div>
    );
  }
  
  return (
    <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </CardTitle>
          <CardDescription className="mt-2">
            Or{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              sign in to an existing account
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailSignUp} className="space-y-4"> {/* Reduced space-y for more fields */}
            <div>
              <Label htmlFor="displayName">Display Name <span className="text-destructive">*</span></Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel" 
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1"
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Note: A simple phone input is provided. For full international support, a specialized component would be used.
              </p>
            </div>
            <div>
              <Label htmlFor="password">Password (min. 6 characters) <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>
            {authErrorHook && (
                <p className="text-sm text-destructive">{authErrorHook}</p>
            )}
            <div>
              <Button type="submit" className="flex w-full justify-center" disabled={isSubmitting || authIsLoading}>
                {isSubmitting || authIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create account"}
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div>
            <Button variant="outline" className="flex w-full justify-center" onClick={handleGoogleSignUp} disabled={isSubmitting || authIsLoading}>
              {isSubmitting || authIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Sign up with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
