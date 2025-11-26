'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '@/lib/api';

export function CostOverview() {
    const [stats, setStats] = useState({
        totalMonthlyCost: 0,
        changePercent: 0,
        totalResources: 0,
    });

    useEffect(() =& gt; {
        // Fetch cost overview data
        const fetchData = async() =& gt; {
            try {
                const response = await api.get('/reports?limit=10');
                const reports = response.data;

                if (reports.length & gt; 0) {
                    const total = reports.reduce((sum: number, r: any) =& gt;
                    sum + parseFloat(r.totalMonthlyCost), 0
          );
                    setStats({
                        totalMonthlyCost: total,
                        changePercent: 5.2,
                        totalResources: reports.length,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch cost overview:', error);
            }
        };

        fetchData();
    }, []);

    return (
    & lt;& gt;
      
        
          
            Total Monthly Cost




    \${ stats.totalMonthlyCost.toFixed(2) }


    {
        stats.changePercent & gt;= 0 ? (

        ): (

            )}
          = 0 ? 'text-green-600' : 'text-red-600'
}& gt;
{ Math.abs(stats.changePercent) }%

    vs last month
        
      

      
        
          Total Reports


{ stats.totalResources }
        
      

      
        
          Average Cost


\${
    stats.totalResources & gt; 0
        ? (stats.totalMonthlyCost / stats.totalResources).toFixed(2)
        : '0.00'
}
        
      
    
  );
}