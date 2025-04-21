// components/layout/Header.tsx
"use client"; // Needed for Clerk hooks and conditional rendering

import Link from "next/link";
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button"; // Your Shadcn Button

export function Header() {
  return (
    // Simple header styling
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center"> {/* Adjust max-width/padding via globals.css @layer base if needed */}
        {/* Left Side: Logo/Title */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* Optional: Add an icon here */}
            {/* <YourIcon className="h-6 w-6" /> */}
            <span className="font-bold sm:inline-block">
              PDF2ClickUp
            </span>
          </Link>
          {/* Optional: Add Navigation Links here */}
          {/* <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/#features">Features</Link>
          </nav> */}
        </div>

        {/* Right Side: Auth Controls */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Show these buttons only when the user is logged OUT */}
          <SignedOut>
             {/* Use SignInButton wrapped by Shadcn Button */}
             {/* `asChild` tells Clerk button to pass props to the child */}
             <SignInButton mode="modal" >
                {/* Wrap the Clerk button component with your Shadcn button */}
                {/* The `asChild` prop might need to be on the Clerk component depending on version */}
                {/* Let's try putting asChild on the Clerk component first */}
                <Button variant="ghost" size="sm" asChild>
                   {/* This structure might be needed if asChild doesn't work directly */}
                   {/* <button>Sign In</button> <- Clerk renders this, we want our Button */}
                   {/* Trying direct wrap first (common pattern): */}
                     <span>Sign In</span>
                </Button>
             </SignInButton>
             {/* Corrected Structure using asChild */}
             <SignInButton mode="modal" asChild>
                <Button variant="ghost" size="sm">Sign In</Button>
             </SignInButton>


             {/* Use SignUpButton wrapped by Shadcn Button */}
             <SignUpButton mode="modal" asChild>
               <Button size="sm">Sign Up</Button>
             </SignUpButton>
          </SignedOut>

          {/* Show the UserButton only when the user is logged IN */}
          <SignedIn>
            <UserButton afterSignOutUrl="/" /> {/* Redirect to landing page after sign out */}
          </SignedIn>
        </div>
      </div>
    </header>
  );
}