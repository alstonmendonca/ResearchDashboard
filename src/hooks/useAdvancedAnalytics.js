import { useMemo } from 'react';

export const useAdvancedAnalytics = (appUsageData, pretestData, demographicsData, dateRange = 'all') => {
  const analytics = useMemo(() => {
    // Helper functions for statistical calculations
    const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const median = (arr) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const standardDeviation = (arr) => {
      if (!arr.length) return 0;
      const avg = mean(arr);
      const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
      return Math.sqrt(mean(squareDiffs));
    };
    const percentile = (arr, p) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      return lower === upper ? sorted[lower] : 
        sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
    };
    const correlation = (x, y) => {
      if (!x.length || !y.length || x.length !== y.length) return 0;
      const n = x.length;
      const meanX = mean(x);
      const meanY = mean(y);
      const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const denominator = Math.sqrt(
        x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) *
        y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
      );
      return denominator ? numerator / denominator : 0;
    };

    // Period comparison helper
    const getPeriodData = (data, days) => {
      if (!data || days === 'all') return data;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return data.filter(item => item.created_at && new Date(item.created_at) >= cutoffDate);
    };

    // Get current period data
    const currentAppUsage = appUsageData || [];
    const currentPretest = pretestData || [];
    const currentDemographics = demographicsData || [];

    // Get comparison period data (previous period of same length)
    const getPreviousPeriodData = (data, days) => {
      if (!data || days === 'all') return [];
      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const previousStart = new Date(now.getTime() - (days * 2) * 24 * 60 * 60 * 1000);
      
      return data.filter(item => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        return itemDate >= previousStart && itemDate < periodStart;
      });
    };

    const periodDays = {
      'today': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'all': 'all'
    };

    const currentPeriodDays = periodDays[dateRange] || 'all';
    const previousAppUsage = getPreviousPeriodData(currentAppUsage, currentPeriodDays);
    const previousPretest = getPreviousPeriodData(currentPretest, currentPeriodDays);

    // Session Duration Analytics for current period
    const sessionDurations = currentAppUsage
      .map(session => session.duration_minutes)
      .filter(duration => duration != null && duration > 0);

    const previousSessionDurations = previousAppUsage
      .map(session => session.duration_minutes)
      .filter(duration => duration != null && duration > 0);

    const sessionAnalytics = {
      count: sessionDurations.length,
      mean: mean(sessionDurations),
      median: median(sessionDurations),
      standardDeviation: standardDeviation(sessionDurations),
      min: sessionDurations.length ? Math.min(...sessionDurations) : 0,
      max: sessionDurations.length ? Math.max(...sessionDurations) : 0,
      percentiles: {
        p25: percentile(sessionDurations, 25),
        p75: percentile(sessionDurations, 75),
        p90: percentile(sessionDurations, 90),
        p95: percentile(sessionDurations, 95)
      },
      // Period comparison
      previousPeriod: {
        count: previousSessionDurations.length,
        mean: mean(previousSessionDurations),
        median: median(previousSessionDurations),
        change: {
          count: previousSessionDurations.length ? 
            ((sessionDurations.length - previousSessionDurations.length) / previousSessionDurations.length * 100) : 0,
          mean: previousSessionDurations.length ? 
            ((mean(sessionDurations) - mean(previousSessionDurations)) / mean(previousSessionDurations) * 100) : 0
        }
      }
    };

    // Time Series Analysis with period-specific grouping
    const getTimeSeriesGrouping = (days) => {
      if (days <= 7) return 'daily';
      if (days <= 30) return 'daily';
      if (days <= 90) return 'weekly';
      return 'monthly';
    };

    const grouping = getTimeSeriesGrouping(currentPeriodDays === 'all' ? 365 : currentPeriodDays);
    
    const sessionsByPeriod = currentAppUsage.reduce((acc, session) => {
      if (session.created_at) {
        const date = new Date(session.created_at);
        let key;
        
        if (grouping === 'daily') {
          key = date.toDateString();
        } else if (grouping === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toDateString();
        } else {
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        }
        
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});

    const timeSeriesData = Object.entries(sessionsByPeriod)
      .map(([period, count]) => ({ 
        period: grouping === 'monthly' ? period : new Date(period), 
        count,
        grouping 
      }))
      .sort((a, b) => {
        if (grouping === 'monthly') {
          return a.period.localeCompare(b.period);
        }
        return a.period - b.period;
      });

    // Trend calculation (linear regression) - updated for new time series
    const calculateTrend = (data) => {
      if (data.length < 2) return { slope: 0, direction: 'stable' };
      const n = data.length;
      const sumX = data.reduce((sum, _, i) => sum + i, 0);
      const sumY = data.reduce((sum, item) => sum + item.count, 0);
      const sumXY = data.reduce((sum, item, i) => sum + i * item.count, 0);
      const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
      
      return { slope, direction };
    };

    const sessionTrend = calculateTrend(timeSeriesData);

    // Period-over-period comparison insights
    const periodComparison = {
      sessions: {
        current: sessionAnalytics.count,
        previous: sessionAnalytics.previousPeriod.count,
        change: sessionAnalytics.previousPeriod.change.count,
        trend: sessionAnalytics.previousPeriod.change.count > 5 ? 'increasing' : 
               sessionAnalytics.previousPeriod.change.count < -5 ? 'decreasing' : 'stable'
      },
      duration: {
        current: sessionAnalytics.mean,
        previous: sessionAnalytics.previousPeriod.mean,
        change: sessionAnalytics.previousPeriod.change.mean,
        trend: sessionAnalytics.previousPeriod.change.mean > 5 ? 'increasing' : 
               sessionAnalytics.previousPeriod.change.mean < -5 ? 'decreasing' : 'stable'
      },
      participants: {
        current: new Set(currentAppUsage.map(s => s.participant_number).filter(Boolean)).size,
        previous: new Set(previousAppUsage.map(s => s.participant_number).filter(Boolean)).size
      }
    };

    // Calculate participant change
    periodComparison.participants.change = periodComparison.participants.previous ? 
      ((periodComparison.participants.current - periodComparison.participants.previous) / 
       periodComparison.participants.previous * 100) : 0;

    // Demographic Analysis
    const demographicDistribution = currentDemographics.reduce((acc, person) => {
      Object.entries(person).forEach(([key, value]) => {
        if (value != null && key !== 'id' && key !== 'created_at') {
          if (!acc[key]) acc[key] = {};
          const valueStr = String(value);
          acc[key][valueStr] = (acc[key][valueStr] || 0) + 1;
        }
      });
      return acc;
    }, {});

    // Pretest Response Analysis
    const pretestAnalysis = currentPretest.reduce((acc, response) => {
      // Analyze boolean fields
      Object.entries(response).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          if (!acc.booleanFields) acc.booleanFields = {};
          if (!acc.booleanFields[key]) acc.booleanFields[key] = { true: 0, false: 0 };
          acc.booleanFields[key][value] += 1;
        }
        // Analyze numeric fields
        if (typeof value === 'number' && !key.includes('id')) {
          if (!acc.numericFields) acc.numericFields = {};
          if (!acc.numericFields[key]) acc.numericFields[key] = [];
          acc.numericFields[key].push(value);
        }
      });
      return acc;
    }, {});

    // Calculate statistics for numeric pretest fields
    if (pretestAnalysis.numericFields) {
      Object.keys(pretestAnalysis.numericFields).forEach(field => {
        const values = pretestAnalysis.numericFields[field];
        pretestAnalysis.numericFields[field] = {
          values,
          mean: mean(values),
          median: median(values),
          standardDeviation: standardDeviation(values),
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });
    }

    // Correlation Analysis
    const correlations = {};
    if (currentAppUsage && currentAppUsage.length > 5) {
      const participantData = currentAppUsage.reduce((acc, session) => {
        if (session.participant_number && session.duration_minutes) {
          if (!acc[session.participant_number]) {
            acc[session.participant_number] = {
              sessions: 0,
              totalDuration: 0,
              avgDuration: 0
            };
          }
          acc[session.participant_number].sessions += 1;
          acc[session.participant_number].totalDuration += session.duration_minutes;
          acc[session.participant_number].avgDuration = 
            acc[session.participant_number].totalDuration / acc[session.participant_number].sessions;
        }
        return acc;
      }, {});

      const sessionCounts = Object.values(participantData).map(p => p.sessions);
      const avgDurations = Object.values(participantData).map(p => p.avgDuration);
      
      correlations.sessionsVsDuration = {
        coefficient: correlation(sessionCounts, avgDurations),
        strength: Math.abs(correlation(sessionCounts, avgDurations)) > 0.7 ? 'strong' :
                 Math.abs(correlation(sessionCounts, avgDurations)) > 0.3 ? 'moderate' : 'weak'
      };
    }

    // Usage Patterns
    const usagePatterns = {
      hourlyDistribution: {},
      dailyDistribution: {},
      participantEngagement: {}
    };

    currentAppUsage.forEach(session => {
      if (session.created_at) {
        const date = new Date(session.created_at);
        const hour = date.getHours();
        const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        usagePatterns.hourlyDistribution[hour] = (usagePatterns.hourlyDistribution[hour] || 0) + 1;
        usagePatterns.dailyDistribution[day] = (usagePatterns.dailyDistribution[day] || 0) + 1;
      }
      
      if (session.participant_number) {
        const participant = session.participant_number;
        if (!usagePatterns.participantEngagement[participant]) {
          usagePatterns.participantEngagement[participant] = {
            sessions: 0,
            totalDuration: 0,
            lastActivity: null
          };
        }
        usagePatterns.participantEngagement[participant].sessions += 1;
        usagePatterns.participantEngagement[participant].totalDuration += (session.duration_minutes || 0);
        if (session.created_at) {
          const activityDate = new Date(session.created_at);
          if (!usagePatterns.participantEngagement[participant].lastActivity || 
              activityDate > usagePatterns.participantEngagement[participant].lastActivity) {
            usagePatterns.participantEngagement[participant].lastActivity = activityDate;
          }
        }
      }
    });

    // Insights Generation
    const generateInsights = () => {
      const insights = [];
      
      // Session duration insights
      if (sessionAnalytics.mean > 0) {
        if (sessionAnalytics.mean > 30) {
          insights.push({
            type: 'positive',
            category: 'engagement',
            title: 'High Engagement Sessions',
            description: `Average session duration of ${sessionAnalytics.mean.toFixed(1)} minutes indicates strong user engagement.`,
            metric: sessionAnalytics.mean,
            impact: 'high'
          });
        } else if (sessionAnalytics.mean < 10) {
          insights.push({
            type: 'warning',
            category: 'engagement',
            title: 'Short Session Duration',
            description: `Average session duration of ${sessionAnalytics.mean.toFixed(1)} minutes may indicate user experience issues.`,
            metric: sessionAnalytics.mean,
            impact: 'medium'
          });
        }
      }

      // Trend insights
      if (sessionTrend.direction === 'increasing') {
        insights.push({
          type: 'positive',
          category: 'growth',
          title: 'Growing User Activity',
          description: 'Session activity is trending upward, indicating growing user adoption.',
          metric: sessionTrend.slope,
          impact: 'high'
        });
      } else if (sessionTrend.direction === 'decreasing') {
        insights.push({
          type: 'warning',
          category: 'retention',
          title: 'Declining Activity',
          description: 'Session activity is trending downward. Consider user retention strategies.',
          metric: sessionTrend.slope,
          impact: 'high'
        });
      }

      // Variability insights
      if (sessionAnalytics.standardDeviation > sessionAnalytics.mean * 0.8) {
        insights.push({
          type: 'info',
          category: 'behavior',
          title: 'High Usage Variability',
          description: 'Large variation in session durations suggests diverse user behaviors.',
          metric: sessionAnalytics.standardDeviation,
          impact: 'medium'
        });
      }

      // Participation insights
      const uniqueParticipants = new Set(currentAppUsage.map(s => s.participant_number).filter(Boolean)).size;
      const totalSessions = currentAppUsage.length;
      const sessionsPerParticipant = totalSessions / Math.max(uniqueParticipants, 1);
      
      if (sessionsPerParticipant > 5) {
        insights.push({
          type: 'positive',
          category: 'retention',
          title: 'Strong User Retention',
          description: `Average of ${sessionsPerParticipant.toFixed(1)} sessions per participant shows good retention.`,
          metric: sessionsPerParticipant,
          impact: 'high'
        });
      }

      // Period-over-period insights
      if (dateRange !== 'all' && periodComparison.sessions.previous > 0) {
        const changePercent = Math.abs(periodComparison.sessions.change);
        const changeDirection = periodComparison.sessions.change > 0 ? 'increased' : 'decreased';
        
        if (changePercent > 20) {
          insights.push({
            type: periodComparison.sessions.change > 0 ? 'positive' : 'warning',
            category: 'growth',
            title: `Sessions ${changeDirection} by ${changePercent.toFixed(1)}%`,
            description: `Compared to previous ${dateRange === '7d' ? 'week' : dateRange === '30d' ? 'month' : dateRange === '90d' ? 'quarter' : 'period'}, session activity has ${changeDirection} significantly.`,
            metric: periodComparison.sessions.change,
            impact: 'high'
          });
        }

        if (Math.abs(periodComparison.duration.change) > 15) {
          const durationDirection = periodComparison.duration.change > 0 ? 'increased' : 'decreased';
          insights.push({
            type: periodComparison.duration.change > 0 ? 'positive' : 'warning',
            category: 'engagement',
            title: `Session Duration ${durationDirection}`,
            description: `Average session duration has ${durationDirection} by ${Math.abs(periodComparison.duration.change).toFixed(1)}% compared to the previous period.`,
            metric: periodComparison.duration.change,
            impact: 'medium'
          });
        }
      }

      // 30-day and 90-day specific insights
      if (dateRange === '30d') {
        const weeklyAverage = totalSessions / 4.3; // ~4.3 weeks in a month
        if (weeklyAverage > 10) {
          insights.push({
            type: 'positive',
            category: 'activity',
            title: 'High Monthly Activity',
            description: `Averaging ${weeklyAverage.toFixed(1)} sessions per week this month shows strong engagement.`,
            metric: weeklyAverage,
            impact: 'high'
          });
        }
      }

      if (dateRange === '90d') {
        const monthlyAverage = totalSessions / 3;
        const participantGrowth = periodComparison.participants.change;
        
        if (participantGrowth > 10) {
          insights.push({
            type: 'positive',
            category: 'growth',
            title: 'Participant Base Growing',
            description: `${participantGrowth.toFixed(1)}% increase in active participants over the quarter.`,
            metric: participantGrowth,
            impact: 'high'
          });
        }

        if (monthlyAverage > 30) {
          insights.push({
            type: 'positive',
            category: 'volume',
            title: 'High Quarterly Volume',
            description: `Averaging ${monthlyAverage.toFixed(1)} sessions per month indicates sustained usage.`,
            metric: monthlyAverage,
            impact: 'medium'
          });
        }
      }

      // Correlation insights
      if (correlations.sessionsVsDuration && correlations.sessionsVsDuration.strength === 'strong') {
        const direction = correlations.sessionsVsDuration.coefficient > 0 ? 'positive' : 'negative';
        insights.push({
          type: 'info',
          category: 'correlation',
          title: `${direction === 'positive' ? 'Positive' : 'Negative'} Session-Duration Correlation`,
          description: `Strong ${direction} correlation between number of sessions and duration.`,
          metric: correlations.sessionsVsDuration.coefficient,
          impact: 'medium'
        });
      }

      return insights.sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      });
    };

    return {
      sessionAnalytics,
      timeSeriesData,
      sessionTrend,
      periodComparison,
      demographicDistribution,
      pretestAnalysis,
      correlations,
      usagePatterns,
      insights: generateInsights(),
      summary: {
        totalSessions: currentAppUsage.length,
        totalParticipants: new Set(currentAppUsage.map(s => s.participant_number).filter(Boolean)).size,
        totalResponses: currentPretest.length,
        totalDemographics: currentDemographics.length,
        averageSessionDuration: sessionAnalytics.mean,
        engagementTrend: sessionTrend.direction,
        periodRange: dateRange,
        dataQuality: {
          sessionCompleteness: sessionDurations.length / Math.max(currentAppUsage.length, 1),
          responseRate: currentPretest.length / Math.max(new Set(currentAppUsage.map(s => s.participant_number).filter(Boolean)).size, 1)
        },
        // Period comparison summary
        comparisonMetrics: {
          sessionChange: periodComparison.sessions.change,
          durationChange: periodComparison.duration.change,
          participantChange: periodComparison.participants.change,
          periodLabel: dateRange === '7d' ? 'week' : 
                      dateRange === '30d' ? 'month' : 
                      dateRange === '90d' ? 'quarter' : 'period'
        }
      }
    };
  }, [appUsageData, pretestData, demographicsData, dateRange]);

  return analytics;
};

export default useAdvancedAnalytics;