'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { FileUploader } from '@/components/terraform/FileUploader';
import { GitRepoInput } from '@/components/terraform/GitRepoInput';
import { CostBreakdown } from '@/components/terraform/CostBreakdown';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { FileCode, GitBranch, FileJson } from 'lucide-react';

type InputMethod = 'files' | 'git' | 'plan_json';

export default function TerraformPage() {
    const [inputMethod, setInputMethod] = useState('files');
    const [costData, setCostData] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    return (







        Terraform Cost Estimator
            
            
              Estimate infrastructure costs from your Terraform configurations
            
          

          
            Input Method

    setInputMethod('files')
}
className = "flex items-center gap-2"
    & gt;
                
                Upload Files

setInputMethod('git')}
className = "flex items-center gap-2"
    & gt;
                
                Git Repository

setInputMethod('plan_json')}
className = "flex items-center gap-2"
    & gt;
                
                Plan JSON






{
    inputMethod === 'files' & amp;& amp; (
                
              )
}
{
    inputMethod === 'git' & amp;& amp; (
                
              )
}
{
    inputMethod === 'plan_json' & amp;& amp; (


        Upload Plan JSON
                  
                  
                    Upload your Terraform plan JSON file generated with
                    
                      terraform show - json
                    
                  
                
              )
}



{
    costData ? (

    ): (


            Cost breakdown will appear here after calculation
                  
                
              )
}
            
          
        
      
    
  );
}