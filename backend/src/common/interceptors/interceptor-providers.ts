import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

// This is a provider configuration file
export const InterceptorProviders = [
  {
    provide: APP_INTERCEPTOR,
    useClass: AuditInterceptor,
  },
];