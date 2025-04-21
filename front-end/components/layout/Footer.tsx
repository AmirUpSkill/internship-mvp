// components/layout/Footer.tsx
export function Footer() {
    return (
      <footer className="py-6 md:py-8 mt-8 border-t"> {/* Added margin-top */}
        <div className="container flex flex-col items-center justify-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PDF2ClickUp. All rights reserved.
            {/* Optional: Add links to privacy policy, terms, etc. */}
          </p>
        </div>
      </footer>
    );
  }