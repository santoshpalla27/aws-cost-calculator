'use client';

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AWS DevOps Interview Master. All rights reserved.
      </div>
    </footer>
  );
}