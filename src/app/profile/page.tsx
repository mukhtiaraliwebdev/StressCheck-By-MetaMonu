
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, UserCircle, Mail, Edit3, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Timestamp as FirestoreTimestamp } from "firebase/firestore";

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserDisplayName, updateUserPhoneNumber, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectedFrom=/profile');
    }
    if (user) {
      setDisplayName(user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user, authLoading, router]);

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Display name cannot be empty.' });
      return;
    }
    if (displayName.trim() === user?.displayName) {
        toast({ title: 'No Changes', description: 'Display name is the same.' });
        return;
    }

    setIsSubmittingName(true);
    try {
      await updateUserDisplayName(displayName.trim());
      // AuthContext handles success toast
    } catch (error: any) {
      // AuthContext handles error toast
      console.error("Error updating display name on page:", error);
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (phoneNumber && !/^[+]?[0-9\s-()]*$/.test(phoneNumber)) {
        toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please enter a valid phone number format or leave it empty to remove." });
        return;
    }
    if (phoneNumber === (user?.phoneNumber || '')) { // Compare with empty string if user.phoneNumber is null
        toast({ title: 'No Changes', description: 'Phone number is the same.' });
        return;
    }

    setIsSubmittingPhone(true);
    try {
      await updateUserPhoneNumber(phoneNumber);
      // AuthContext handles success toast
    } catch (error: any) {
      // AuthContext handles error toast
      console.error("Error updating phone number on page:", error);
    } finally {
      setIsSubmittingPhone(false);
    }
  };


  if (authLoading || !user) {
    return (
      <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          {user.photoURL ? (
            <Image 
              src={user.photoURL} 
              alt="Profile Picture" 
              width={96} 
              height={96} 
              className="rounded-full mx-auto mb-4 border-2 border-primary"
              data-ai-hint="profile avatar"
            />
          ) : (
            <UserCircle className="mx-auto h-24 w-24 text-primary mb-4" />
          )}
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Your Profile
          </CardTitle>
          <CardDescription className="mt-2">
            View and update your profile details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center text-sm font-medium text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={user.email || 'No email provided'}
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="flex items-center text-sm font-medium text-foreground">
                <Edit3 className="mr-2 h-4 w-4" /> Display Name
              </Label>
              <div className="mt-1">
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full"
                  disabled={isSubmittingName}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmittingName}>
              {isSubmittingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Display Name'}
            </Button>
          </form>
          
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber" className="flex items-center text-sm font-medium text-foreground">
                <Phone className="mr-2 h-4 w-4" /> Phone Number (Optional)
              </Label>
              <div className="mt-1">
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="block w-full"
                  placeholder="+1 (555) 123-4567"
                  disabled={isSubmittingPhone}
                />
                 <p className="text-xs text-muted-foreground mt-1">
                   Leave empty to remove. A simple phone input is provided.
                 </p>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmittingPhone}>
              {isSubmittingPhone ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Phone Number'}
            </Button>
          </form>

        </CardContent>
        <CardFooter className="flex justify-center">
            <p className="text-xs text-muted-foreground">
  Joined on:{' '}
  {user.createdAt instanceof Date
    ? user.createdAt.toLocaleDateString()
    : user.createdAt instanceof FirestoreTimestamp
    ? user.createdAt.toDate().toLocaleDateString()
    : 'N/A'}
</p>

        </CardFooter>
      </Card>
    </div>
  );
}
