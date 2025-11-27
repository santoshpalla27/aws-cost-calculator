'use client';

import React from 'react';
import Link from 'next/link';

const Sidebar = () => {
  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">InfraCost Pro</h1>
      </div>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link 
              href="/" 
              className="block py-2 px-4 rounded hover:bg-gray-700"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              href="/terraform" 
              className="block py-2 px-4 rounded hover:bg-gray-700"
            >
              Terraform Estimator
            </Link>
          </li>
          <li>
            <Link 
              href="/calculators/ec2" 
              className="block py-2 px-4 rounded hover:bg-gray-700"
            >
              AWS Calculators
            </Link>
          </li>
          <li>
            <Link 
              href="/reports" 
              className="block py-2 px-4 rounded hover:bg-gray-700"
            >
              Reports
            </Link>
          </li>
          <li>
            <Link 
              href="/settings" 
              className="block py-2 px-4 rounded hover:bg-gray-700"
            >
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;