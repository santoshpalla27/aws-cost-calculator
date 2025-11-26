import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'InfraCost Analyzer Pro',
    description: 'Infrastructure Cost Analysis Platform',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (


        <span><span style="color: rgb(150, 34, 73); font-weight: bold;">&lt;providers&gt;</span><span style="color: black; font-weight: normal;">
            {children}
        </span></span>


    )
}