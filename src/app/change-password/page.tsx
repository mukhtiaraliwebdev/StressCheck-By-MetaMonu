
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, KeyRound, Info, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const { user, loading: authLoading, changeUserPassword, error: authError } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isPasswordProvider = user?.providerId === 'password' || user?.providerId === undefined; // Undefined might mean old user before providerId was tracked

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectedFrom=/change-password');
    }
  }, [user, authLoading, router]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please enter and confirm your new password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Password Mismatch', description: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Weak Password', description: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await changeUserPassword(newPassword);
      // AuthContext's changeUserPassword handles success toast
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      // AuthContext's changeUserPassword handles error toast
      console.error("Error changing password on page:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Change Password
          </CardTitle>
          <CardDescription className="mt-2">
            Update your account password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isPasswordProvider && (
            <Alert variant="default" className="bg-primary/10 border-primary/30">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Password Change Information</AlertTitle>
              <AlertDescription>
                You signed in using Google. To change your password, please visit your Google account settings.
                <Button variant="link" asChild className="p-0 h-auto ml-1 text-primary">
                    <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
                        Go to Google Security
                    </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isPasswordProvider && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="newPassword">New Password (min. 6 characters)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Change Password'}
              </Button>
            </form>
          )}
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            For security, choose a strong, unique password.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
