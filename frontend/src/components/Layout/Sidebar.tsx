'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileCode,
    Calculator,
    FileText,
    Server,
    Database,
    HardDrive,
    Boxes
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Terraform', href: '/terraform', icon: FileCode },
    {
        name: 'AWS Calculators',
        icon: Calculator,
        children: [
            { name: 'EC2', href: '/calculators/ec2', icon: Server },
            { name: 'RDS', href: '/calculators/rds', icon: Database },
            { name: 'S3', href: '/calculators/s3', icon: HardDrive },
            { name: 'EKS', href: '/calculators/eks', icon: Boxes },
        ]
    },
    { name: 'Reports', href: '/reports', icon: FileText },
];

export function Sidebar() {
    const pathname = usePathname();

    return (


        { navigation.map((item) =& gt; (

            {
                item.children ? (
              & lt;& gt;


    { item.name }


    {
        item.children.map((child) =& gt; (


            { child.name }

        ))
    }
                
              
            ) : (


        { item.name }

    )
}
          
        ))}
      
    
  );
}