'use client';

import React from 'react';
import Link from 'next/link';

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">InfraCost Pro</span>
            </Link>
            <nav className="ml-6 flex space-x-4">
              <Link 
                href="/" 
                className="text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <Link 
                href="/terraform" 
                className="text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Terraform
              </Link>
              <Link 
                href="/calculators/ec2" 
                className="text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Calculators
              </Link>
              <Link 
                href="/reports" 
                className="text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Reports
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
              Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;