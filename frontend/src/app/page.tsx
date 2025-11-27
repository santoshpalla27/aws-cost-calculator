'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            InfraCost Analyzer Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive infrastructure cost analysis platform with Terraform estimation and AWS pricing calculators
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-blue-600 text-xl font-bold">T</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Terraform Cost Estimation</h3>
            <p className="text-gray-600 mb-4">
              Analyze Terraform configurations and estimate infrastructure costs using Infracost
            </p>
            <Link 
              href="/terraform" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Analyze Configuration
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-green-600 text-xl font-bold">A</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AWS Cost Calculators</h3>
            <p className="text-gray-600 mb-4">
              Interactive calculators for EC2, RDS, S3, and EKS services
            </p>
            <Link 
              href="/calculators/ec2" 
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Calculate Costs
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-purple-600 text-xl font-bold">R</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Reports & History</h3>
            <p className="text-gray-600 mb-4">
              Track and analyze cost trends over time with detailed reports
            </p>
            <Link 
              href="/reports" 
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Reports
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold">Terraform Integration</h3>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold">Real-time Pricing</h3>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold">Cost Optimization</h3>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold">Detailed Reporting</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}