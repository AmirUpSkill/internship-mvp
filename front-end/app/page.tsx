// app/page.tsx (Landing Page)
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Optional: Import components if you build them
// import { HeroSection } from '@/components/landing/HeroSection';
// import { Features } from '@/components/landing/Features';

export default function LandingPage() {
  return (
    // Centering content vertically and horizontally
    <div className="flex flex-col items-center justify-center flex-grow text-center px-4">
      {/* --- Replace with your Landing Page Components --- */}
      {/* Example Minimal Content: */}
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
        Turn PDFs into ClickUp Tasks Instantly
      </h1>
      <p className="mb-8 text-lg text-muted-foreground max-w-xl">
        Stop manual data entry. Upload your PDF, provide simple instructions,
        and let AI create structured tasks directly in your ClickUp list.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" asChild>
          {/* This button directs users to the core app.
              If they are not logged in, the middleware will redirect them
              to the sign-in page automatically. */}
          <Link href="/app">Get Started Now</Link>
        </Button>
         {/* You COULD add an explicit SignUpButton here if desired, but
             the header and the Get Started flow often cover it.
         <SignUpButton mode="modal" asChild>
            <Button size="lg" variant="outline">Sign Up Free</Button>
         </SignUpButton>
         */}
      </div>
      {/* --- End Example Content --- */}

      {/* Add other sections like Features, How it Works etc. below */}
      {/* <Features /> */}

    </div>
  );
}