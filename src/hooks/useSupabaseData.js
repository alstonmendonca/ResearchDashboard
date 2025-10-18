import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Auto-refresh every 30 seconds
const AUTO_REFRESH_INTERVAL = 30000;

export const useSupabaseData = (tableName) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: result, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    
    // Set up real-time subscription
    const subscription = supabase
      .channel(`${tableName}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: tableName },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [fetchData, tableName]);

  return { data, loading, error, refetch: fetchData };
};

export const useAppUsageSessions = () => {
  return useSupabaseData('app_usage_sessions');
};

export const usePretestResponses = () => {
  return useSupabaseData('pretest_responses');
};

export const useDemographicSurveys = () => {
  return useSupabaseData('demographic_surveys');
};

export const useParticipants = () => {
  return useSupabaseData('participants');
};

// Hook to get only active participants (id_used = true)
export const useActiveParticipants = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: result, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id_used', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching active participants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    
    const subscription = supabase
      .channel('participants_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'participants' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};