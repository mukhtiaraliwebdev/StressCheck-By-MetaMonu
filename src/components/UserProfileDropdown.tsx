
"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, LogIn, UserPlus, LogOut, Settings, ShieldCheck, KeyRound, Loader2, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function UserProfileDropdown() {
  const { user, loading: authLoading, signOut } = useAuth(); 

  if (authLoading) { 
    return (
      <Button variant="ghost" size="icon" className="rounded-full" disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          {user ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
              <AvatarFallback>
                {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : <UserCircle2 className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserCircle2 className="h-6 w-6" />
          )}
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Plan: {user.subscriptionTier === 'premium' ? 'Premium' : 'Free'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
              <Link href="/change-password">
                <KeyRound className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </Link>
            </DropdownMenuItem>
            {/* Settings removed as per request */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Guest</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
