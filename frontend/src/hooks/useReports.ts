import { useState, useEffect } from 'react';
import api from '@/lib/api';

export function useReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async (filters?: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports', { params: filters });
      setReports(response.data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await api.delete(`/reports/${id}`);
      setReports(reports.filter(r => r.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete report');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    loading,
    error,
    fetchReports,
    deleteReport,
  };
}