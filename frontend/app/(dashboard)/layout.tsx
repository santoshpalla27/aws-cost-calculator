import { ReactNode } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4">
        <h2 className="text-xl font-bold mb-6">Project Manager</h2>
        <nav>
          <ul className="space-y-2">
            <li>
              <a href="/dashboard" className="block p-2 hover:bg-gray-100 rounded">Dashboard</a>
            </li>
            <li>
              <a href="/projects" className="block p-2 hover:bg-gray-100 rounded">Projects</a>
            </li>
            <li>
              <a href="/tasks" className="block p-2 hover:bg-gray-100 rounded">Tasks</a>
            </li>
            <li>
              <a href="/personal" className="block p-2 hover:bg-gray-100 rounded">Personal</a>
            </li>
            <li>
              <a href="/pages" className="block p-2 hover:bg-gray-100 rounded">Pages</a>
            </li>
            <li>
              <a href="/team" className="block p-2 hover:bg-gray-100 rounded">Team</a>
            </li>
            <li>
              <a href="/analytics" className="block p-2 hover:bg-gray-100 rounded">Analytics</a>
            </li>
            <li>
              <a href="/settings" className="block p-2 hover:bg-gray-100 rounded">Settings</a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}