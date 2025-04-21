// app/(protected)/app/page.tsx (New file)
// --- Make sure WizardContainer is correctly imported ---
// Adjust the import path if necessary, e.g., if WizardContainer was moved
import { WizardContainer } from '@/components/wizard/WizardContainer'; // Check this path!

export default function WizardAppPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:p-12">
      {/* Render the main wizard component here */}
      <WizardContainer />
    </main>
  );
}