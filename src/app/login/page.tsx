
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail, signInWithGoogle, loading: authIsLoading, error: authErrorHook, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false); // For disabling form during its own submission

  useEffect(() => {
    // If user exists and auth context is no longer loading, redirect to home.
    if (user && !authIsLoading) {
      console.log("[LoginPage] User detected, auth not loading, redirecting to /");
      router.push('/');
    }
  }, [user, authIsLoading, router]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please enter both email and password." });
      return;
    }
    setIsSubmitting(true);
    await signInWithEmail(email, password);
    setIsSubmitting(false);
    // Redirection to home on successful login is now primarily handled by the useEffect above
    // or by the router.push('/') inside signInWithEmail in AuthContext.
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    setIsSubmitting(false);
    // Redirection to home on successful login is handled by useEffect or AuthContext.
  };

  // Case 1: AuthContext is performing its initial check.
  if (authIsLoading) {
    return (
        <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading session...</p>
        </div>
    );
  }

  // Case 2: AuthContext is settled, and user is logged in.
  // The useEffect above should trigger a redirect. Render a loader while redirecting.
  if (!authIsLoading && user) {
    return (
        <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirecting to homepage...</p>
        </div>
    );
  }

  // Case 3: AuthContext is settled, and no user is logged in. Show the login form.
  return (
    <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Sign in to your account
          </CardTitle>
          <CardDescription className="mt-2">
            Or{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              create a new account
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium leading-6 text-foreground">
                Email address
              </Label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-foreground shadow-sm ring-1 ring-inset ring-input placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium leading-6 text-foreground">
                Password
              </Label>
              <div className="mt-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-foreground shadow-sm ring-1 ring-inset ring-input placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {authErrorHook && (
                <p className="text-sm text-destructive">{authErrorHook}</p>
            )}
            <div>
              <Button type="submit" className="flex w-full justify-center" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign in"}
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
            <Button variant="outline" className="flex w-full justify-center" onClick={handleGoogleLogin} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
