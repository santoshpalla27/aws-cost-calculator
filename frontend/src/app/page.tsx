import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to{' '}
          <a className="text-blue-600" href="https://nextjs.org">
            AWS DevOps Interview Master!
          </a>
        </h1>

        <p className="mt-3 text-2xl">
          Get ready to ace your next interview.
        </p>

        <div className="flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full">
          <Link href="/login" passHref>
            <Button>Login</Button>
          </Link>
          <Link href="/signup" passHref>
            <Button variant="outline">Sign Up</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}