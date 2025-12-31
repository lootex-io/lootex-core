import { Button } from '@/components/ui/button'; // Assuming you have shadcn/ui installed
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        {/* Large 404 display */}
        <p className="text-base font-bold">404</p>
        <h1 className="text-3xl font-brand sm:text-5xl">Page not found</h1>

        {/* Message */}
        <p className="mt-6 text-base text-muted-foreground">
          Sorry, we couldn't find the page you're looking for.
        </p>

        {/* Action buttons */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
