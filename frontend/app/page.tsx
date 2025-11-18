import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <main className="flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold">Project Management App</h1>
        <p className="text-lg text-center text-gray-600 max-w-md">
          A comprehensive solution for managing projects, tasks, and personal productivity
        </p>
        <div className="flex gap-4">
          <Link 
            href="/dashboard" 
            className="rounded bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link 
            href="/auth/login" 
            className="rounded border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50"
          >
            Login
          </Link>
        </div>
      </main>
    </div>
  )
}