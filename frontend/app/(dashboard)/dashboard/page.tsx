export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Total Projects</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Active Tasks</h3>
          <p className="text-3xl font-bold mt-2">24</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Completed Tasks</h3>
          <p className="text-3xl font-bold mt-2">42</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-3xl font-bold mt-2">8</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <span className="text-blue-600">✓</span>
              </div>
              <div>
                <p className="font-medium">Task completed: Design login page</p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <span className="text-green-600">✓</span>
              </div>
              <div>
                <p className="font-medium">Project created: User Authentication</p>
                <p className="text-sm text-gray-500">5 hours ago</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <span className="text-purple-600">✓</span>
              </div>
              <div>
                <p className="font-medium">New comment on task #123</p>
                <p className="text-sm text-gray-500">1 day ago</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Upcoming Tasks</h2>
          <ul className="space-y-3">
            <li className="border-b pb-3 last:border-0 last:pb-0">
              <p className="font-medium">Implement JWT authentication</p>
              <p className="text-sm text-gray-500">Due: Tomorrow</p>
              <div className="flex items-center mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span className="text-xs">High Priority</span>
              </div>
            </li>
            <li className="border-b pb-3 last:border-0 last:pb-0">
              <p className="font-medium">Add password reset functionality</p>
              <p className="text-sm text-gray-500">Due: In 3 days</p>
              <div className="flex items-center mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                <span className="text-xs">Medium Priority</span>
              </div>
            </li>
            <li>
              <p className="font-medium">Fix login button styling</p>
              <p className="text-sm text-gray-500">Due: Next week</p>
              <div className="flex items-center mt-1">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                <span className="text-xs">Low Priority</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}