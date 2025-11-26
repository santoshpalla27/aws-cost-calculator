'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { api } from '@/lib/api';
import { DollarSign } from 'lucide-react';

interface EC2Form {
    instanceType: string;
    region: string;
    osType: string;
    tenancy: string;
    pricingModel: string;
    quantity: number;
    awsAccessKey: string;
    awsSecretKey: string;
}

export function EC2Calculator() {
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data: EC2Form) =& gt; {
        setIsCalculating(true);
        try {
            const response = await api.post('/aws/ec2/calculate', data);
            setResult(response.data);
        } catch (error) {
            console.error('Calculation failed:', error);
        } finally {
            setIsCalculating(false);
        }
    };

    return (


        Configuration
        
          
            
              Instance Type






    Region
            
            
              US East(N.Virginia)
              US West(Oregon)
    EU(Ireland)
              Asia Pacific(Singapore)
            
          

          
            
              Operating System


    Linux
    Windows
    RHEL





    Quantity
            
            
          

          
            
              AWS Access Key
            
            
          

          
            
              AWS Secret Key





    { isCalculating ? 'Calculating...' : 'Calculate Cost' }
          
        
      

      
        Cost Estimate
    {
        result ? (




            Total Monthly Cost


        \${ result.totalMonthlyCost }
              
            

            
              
                Hourly Cost
        \${ result.totalHourlyCost }
              
              
                Instance Cost(Monthly)
        \${ result.instanceCost.monthly }

        {
            result.ebsCost.monthly & gt; 0 & amp;& amp; (

                EBS Cost(Monthly)
            \${ result.ebsCost.monthly }
                
              )
        }
            
          
        ) : (

            Fill in the configuration and click Calculate to see cost estimates
          
        )
    }
      
    
  );
}