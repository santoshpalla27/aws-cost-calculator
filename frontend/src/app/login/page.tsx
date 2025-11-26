'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { useAuthStore } from '@/lib/store/authStore';
import { Mail, Lock, AlertCircle } from 'lucide-react';

interface LoginForm {
    email: string;
    password: string;
}

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm < span ><span style="color: rgb(150, 34, 73); font-weight: bold;">&lt;loginform&gt;</span><span style="color: black; font-weight: normal;">();

  const onSubmit = async (data: LoginForm) =&gt; {
    setIsLoading(true);
    setError('');

    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
      
        
          
            InfraCost Analyzer Pro
          
          Sign in to your account
        

        {error &amp;&amp; (
          
            
            {error}
          
        )}

        
          
            
              Email
            
            
              
              
            
            {errors.email &amp;&amp; (
              {errors.email.message}
            )}
          

          
            
              Password
            
            
              
              
            
            {errors.password &amp;&amp; (
              {errors.password.message}
            )}
          

          
            {isLoading ? 'Signing in...' : 'Sign In'}
          
        

        
          Don't have an account?{' '}
          
            Sign up
          
        
      
    
  );
}