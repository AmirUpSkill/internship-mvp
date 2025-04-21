// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Header } from '@/components/layout/Header'; // Adjust path if necessary
import { Footer } from '@/components/layout/Footer'; // Adjust path if necessary
import { Inter as FontSans } from "next/font/google" // Example font setup
import { cn } from "@/lib/utils" // For merging classes

// Example font setup (adjust as needed)
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

// Add Metadata if you haven't already
export const metadata = {
  title: 'PDF-to-ClickUp Wizard',
  description: 'Convert PDFs to ClickUp tasks using AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
          {/* Structure for sticky footer */}
          <div className="relative flex min-h-screen flex-col">
            <Header />
            {/* Main content area that grows */}
            <main className="flex-grow container py-8"> {/* Added container & padding */}
                {children}
            </main>
            <Footer />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}