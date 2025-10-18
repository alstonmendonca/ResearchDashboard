import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Info,
  Download,
  Filter,
  Calendar,
  Zap,
  Target,
  Layers
} from 'lucide-react';
import { Bar, Line, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import useAdvancedAnalytics from '../hooks/useAdvancedAnalytics';
import StatisticalCharts from './StatisticalCharts';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsDashboard = ({ appUsageData, pretestData, demographicsData }) => {
  const [activeView, setActiveView] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [demographicFilter, setDemographicFilter] = useState('all');
  const [participantFilter, setParticipantFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Enhanced filtering state
  const [filters, setFilters] = useState({
    sessionDuration: { min: null, max: null },
    ageRange: { min: null, max: null },
    gender: [],
    deviceType: [],
    sessionType: [],
    engagement: 'all', // high, medium, low, all
    customDateRange: { start: null, end: null }
  });

  // Filter update helpers
  const updateFilter = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearAllFilters = () => {
    setDateRange('all');
    setDemographicFilter('all');
    setParticipantFilter('all');
    setFilters({
      sessionDuration: { min: null, max: null },
      ageRange: { min: null, max: null },
      gender: [],
      deviceType: [],
      sessionType: [],
      engagement: 'all',
      customDateRange: { start: null, end: null }
    });
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (dateRange !== 'all') count++;
    if (demographicFilter !== 'all') count++;
    if (participantFilter !== 'all') count++;
    if (filters.sessionDuration.min || filters.sessionDuration.max) count++;
    if (filters.ageRange.min || filters.ageRange.max) count++;
    if (filters.gender.length > 0) count++;
    if (filters.deviceType.length > 0) count++;
    if (filters.sessionType.length > 0) count++;
    if (filters.engagement !== 'all') count++;
    if (filters.customDateRange.start || filters.customDateRange.end) count++;
    return count;
  };
  
  // Apply filters to data
  const filteredData = useMemo(() => {
    let filteredAppUsage = appUsageData || [];
    let filteredPretest = pretestData || [];
    let filteredDemographics = demographicsData || [];
    
    // Date filtering
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (dateRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        filteredAppUsage = filteredAppUsage.filter(item => 
          item.created_at && new Date(item.created_at) >= cutoffDate
        );
        filteredPretest = filteredPretest.filter(item => 
          item.created_at && new Date(item.created_at) >= cutoffDate
        );
        filteredDemographics = filteredDemographics.filter(item => 
          item.created_at && new Date(item.created_at) >= cutoffDate
        );
      }
    }
    
    // Demographic filtering
    if (demographicFilter !== 'all' && filteredPretest.length > 0) {
      const [field, value] = demographicFilter.split(':');
      if (field && value) {
        const eligibleParticipants = new Set(
          filteredPretest
            .filter(item => String(item[field]) === value)
            .map(item => item.participant_number)
            .filter(Boolean)
        );
        
        filteredAppUsage = filteredAppUsage.filter(item => 
          eligibleParticipants.has(item.participant_number)
        );
      }
    }
    
    // Participant filtering
    if (participantFilter !== 'all') {
      filteredAppUsage = filteredAppUsage.filter(item => 
        item.participant_number === participantFilter
      );
      filteredPretest = filteredPretest.filter(item => 
        item.participant_number === participantFilter
      );
      filteredDemographics = filteredDemographics.filter(item => 
        item.participant_number === participantFilter
      );
    }

    // Enhanced filtering
    
    // Custom date range filtering
    if (filters.customDateRange.start || filters.customDateRange.end) {
      const startDate = filters.customDateRange.start ? new Date(filters.customDateRange.start) : null;
      const endDate = filters.customDateRange.end ? new Date(filters.customDateRange.end) : null;
      
      if (startDate || endDate) {
        filteredAppUsage = filteredAppUsage.filter(item => {
          if (!item.created_at) return false;
          const itemDate = new Date(item.created_at);
          return (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
        });
        filteredPretest = filteredPretest.filter(item => {
          if (!item.created_at) return false;
          const itemDate = new Date(item.created_at);
          return (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
        });
      }
    }

    // Session duration filtering
    if (filters.sessionDuration.min !== null || filters.sessionDuration.max !== null) {
      filteredAppUsage = filteredAppUsage.filter(item => {
        const duration = item.session_duration || 0;
        return (filters.sessionDuration.min === null || duration >= filters.sessionDuration.min) &&
               (filters.sessionDuration.max === null || duration <= filters.sessionDuration.max);
      });
    }

    // Age range filtering
    if (filters.ageRange.min !== null || filters.ageRange.max !== null) {
      const eligibleParticipants = new Set(
        filteredPretest
          .filter(item => {
            const age = item.age || 0;
            return (filters.ageRange.min === null || age >= filters.ageRange.min) &&
                   (filters.ageRange.max === null || age <= filters.ageRange.max);
          })
          .map(item => item.participant_number)
          .filter(Boolean)
      );
      
      filteredAppUsage = filteredAppUsage.filter(item => 
        eligibleParticipants.has(item.participant_number)
      );
    }

    // Gender filtering
    if (filters.gender.length > 0) {
      const eligibleParticipants = new Set(
        filteredPretest
          .filter(item => filters.gender.includes(item.gender))
          .map(item => item.participant_number)
          .filter(Boolean)
      );
      
      filteredAppUsage = filteredAppUsage.filter(item => 
        eligibleParticipants.has(item.participant_number)
      );
    }

    // Device type filtering
    if (filters.deviceType.length > 0) {
      filteredAppUsage = filteredAppUsage.filter(item => 
        filters.deviceType.includes(item.device_type)
      );
    }

    // Session type filtering
    if (filters.sessionType.length > 0) {
      filteredAppUsage = filteredAppUsage.filter(item => 
        filters.sessionType.includes(item.session_type)
      );
    }

    // Engagement level filtering
    if (filters.engagement !== 'all') {
      filteredAppUsage = filteredAppUsage.filter(item => {
        const duration = item.session_duration || 0;
        switch (filters.engagement) {
          case 'high':
            return duration >= 30; // 30+ minutes
          case 'medium':
            return duration >= 10 && duration < 30; // 10-30 minutes
          case 'low':
            return duration < 10; // Under 10 minutes
          default:
            return true;
        }
      });
    }
    
    return {
      appUsage: filteredAppUsage,
      pretest: filteredPretest,
      demographics: filteredDemographics
    };
  }, [appUsageData, pretestData, demographicsData, dateRange, demographicFilter, participantFilter, filters]);
  
  const analytics = useAdvancedAnalytics(filteredData.appUsage, filteredData.pretest, filteredData.demographics, dateRange);

  // Get filter options from data
  const filterOptions = useMemo(() => {
    const genderOptions = [...new Set((pretestData || []).map(item => item.gender).filter(Boolean))];
    const deviceOptions = [...new Set((appUsageData || []).map(item => item.device_type).filter(Boolean))];
    const sessionTypeOptions = [...new Set((appUsageData || []).map(item => item.session_type).filter(Boolean))];
    
    const sessionDurations = (appUsageData || []).map(item => item.session_duration || 0);
    const ages = (pretestData || []).map(item => item.age || 0);
    
    return {
      genders: genderOptions,
      deviceTypes: deviceOptions,
      sessionTypes: sessionTypeOptions,
      sessionDurationRange: {
        min: Math.min(...sessionDurations, 0),
        max: Math.max(...sessionDurations, 0)
      },
      ageRange: {
        min: Math.min(...ages, 0),
        max: Math.max(...ages, 0)
      }
    };
  }, [appUsageData, pretestData]);

  // Get unique participants for filtering
  const uniqueParticipants = useMemo(() => {
    const participants = new Set();
    (appUsageData || []).forEach(item => {
      if (item.participant_number) participants.add(item.participant_number);
    });
    return Array.from(participants).sort();
  }, [appUsageData]);

  // Get demographic filter options
  const demographicOptions = useMemo(() => {
    if (!pretestData || pretestData.length === 0) return [];
    
    const options = [];
    const sampleItem = pretestData[0];
    
    Object.entries(sampleItem).forEach(([field, value]) => {
      if (typeof value === 'boolean' || (typeof value === 'string' && !field.includes('id') && !field.includes('date'))) {
        const uniqueValues = [...new Set(pretestData.map(item => item[field]).filter(Boolean))];
        uniqueValues.forEach(val => {
          options.push({
            label: `${field.replace(/_/g, ' ')}: ${val}`,
            value: `${field}:${val}`
          });
        });
      }
    });
    
    return options.slice(0, 10); // Limit to 10 options
  }, [pretestData]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { 
          boxWidth: 12,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { size: 10 } }
      },
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { size: 10 } }
      }
    }
  };

  // Session duration distribution chart
  const sessionDurationChart = {
    labels: ['0-5 min', '5-15 min', '15-30 min', '30-60 min', '60+ min'],
    datasets: [{
      label: 'Sessions',
      data: [
        (filteredData.appUsage || []).filter(s => (s.duration_minutes || 0) <= 5).length,
        (filteredData.appUsage || []).filter(s => (s.duration_minutes || 0) > 5 && (s.duration_minutes || 0) <= 15).length,
        (filteredData.appUsage || []).filter(s => (s.duration_minutes || 0) > 15 && (s.duration_minutes || 0) <= 30).length,
        (filteredData.appUsage || []).filter(s => (s.duration_minutes || 0) > 30 && (s.duration_minutes || 0) <= 60).length,
        (filteredData.appUsage || []).filter(s => (s.duration_minutes || 0) > 60).length,
      ],
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
      borderWidth: 0
    }]
  };

  // Daily sessions trend chart - updated to use new time series data
  const dailyTrendChart = {
    labels: analytics.timeSeriesData.map(d => {
      if (analytics.timeSeriesData[0]?.grouping === 'monthly') {
        return d.period;
      }
      return d.period.toLocaleDateString();
    }),
    datasets: [{
      label: `${analytics.timeSeriesData[0]?.grouping === 'weekly' ? 'Weekly' : 
               analytics.timeSeriesData[0]?.grouping === 'monthly' ? 'Monthly' : 'Daily'} Sessions`,
      data: analytics.timeSeriesData.map(d => d.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  // Hourly usage pattern
  const hourlyPattern = Array.from({ length: 24 }, (_, hour) => 
    analytics.usagePatterns.hourlyDistribution[hour] || 0
  );
  
  const hourlyChart = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Sessions by Hour',
      data: hourlyPattern,
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: '#3b82f6',
      borderWidth: 1
    }]
  };

  // Demographic distribution (exclude participant_id and sample_code)
  const demographicCharts = Object.entries(analytics.demographicDistribution)
    .filter(([field]) => field !== 'participant_id' && field !== 'sample_code')
    .map(([field, distribution]) => ({
      field,
      chart: {
        labels: Object.keys(distribution),
        datasets: [{
          data: Object.values(distribution),
          backgroundColor: [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
          ],
          borderWidth: 0
        }]
      }
    }));

  const exportAnalytics = () => {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      { Metric: 'Total Sessions', Value: analytics.summary.totalSessions },
      { Metric: 'Total Participants', Value: analytics.summary.totalParticipants },
      { Metric: 'Average Session Duration (min)', Value: analytics.sessionAnalytics.mean.toFixed(2) },
      { Metric: 'Median Session Duration (min)', Value: analytics.sessionAnalytics.median.toFixed(2) },
      { Metric: 'Session Duration Std Dev', Value: analytics.sessionAnalytics.standardDeviation.toFixed(2) },
      { Metric: 'Engagement Trend', Value: analytics.summary.engagementTrend },
      { Metric: 'Data Quality - Session Completeness', Value: (analytics.summary.dataQuality.sessionCompleteness * 100).toFixed(1) + '%' },
      { Metric: 'Response Rate', Value: (analytics.summary.dataQuality.responseRate * 100).toFixed(1) + '%' }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Analytics Summary');
    
    // Insights sheet
    const insightsSheet = XLSX.utils.json_to_sheet(analytics.insights);
    XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Key Insights');
    
    // Session analytics
    const sessionStatsData = [
      { Statistic: 'Mean', Value: analytics.sessionAnalytics.mean },
      { Statistic: 'Median', Value: analytics.sessionAnalytics.median },
      { Statistic: 'Standard Deviation', Value: analytics.sessionAnalytics.standardDeviation },
      { Statistic: 'Minimum', Value: analytics.sessionAnalytics.min },
      { Statistic: 'Maximum', Value: analytics.sessionAnalytics.max },
      { Statistic: '25th Percentile', Value: analytics.sessionAnalytics.percentiles.p25 },
      { Statistic: '75th Percentile', Value: analytics.sessionAnalytics.percentiles.p75 },
      { Statistic: '90th Percentile', Value: analytics.sessionAnalytics.percentiles.p90 },
      { Statistic: '95th Percentile', Value: analytics.sessionAnalytics.percentiles.p95 }
    ];
    
    const sessionStatsSheet = XLSX.utils.json_to_sheet(sessionStatsData);
    XLSX.utils.book_append_sheet(workbook, sessionStatsSheet, 'Session Statistics');
    
    // Daily trends
    const dailyTrendsSheet = XLSX.utils.json_to_sheet(
      analytics.dailySessions.map(d => ({
        Date: d.date.toDateString(),
        Sessions: d.count
      }))
    );
    XLSX.utils.book_append_sheet(workbook, dailyTrendsSheet, 'Daily Trends');
    
    const filename = `research_analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const InsightCard = ({ insight }) => {
    const iconMap = {
      positive: <CheckCircle className="w-5 h-5 text-blue-900" />,
      warning: <AlertCircle className="w-5 h-5 text-gray-600" />,
      info: <Info className="w-5 h-5 text-blue-900" />
    };

    const bgMap = {
      positive: 'bg-gray-50 border-gray-200',
      warning: 'bg-gray-50 border-gray-200',
      info: 'bg-gray-50 border-gray-200'
    };

    return (
      <div className={`p-4 rounded-lg border ${bgMap[insight.type]}`}>
        <div className="flex items-start space-x-3">
          {iconMap[insight.type]}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 capitalize">{insight.category}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                insight.impact === 'high' ? 'bg-blue-900 text-white' :
                insight.impact === 'medium' ? 'bg-gray-200 text-gray-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {insight.impact} impact
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-xl`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-4 h-4 text-blue-900 mr-1" />
          ) : trend.direction === 'down' ? (
            <TrendingDown className="w-4 h-4 text-gray-600 mr-1" />
          ) : null}
          <span className={`text-sm ${
            trend.direction === 'up' ? 'text-blue-900' : 
            trend.direction === 'down' ? 'text-gray-600' : 'text-gray-600'
          }`}>
            {trend.text}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600">Comprehensive statistical analysis and insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors relative ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="90d">Last 90 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="today">Today</option>
          </select>
          
          <button
            onClick={exportAnalytics}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Analytics
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="space-y-6">
            {/* Filter Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <div className="flex items-center space-x-2">
                {getActiveFilterCount() > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participant</label>
                <select
                  value={participantFilter}
                  onChange={(e) => setParticipantFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Participants</option>
                  {uniqueParticipants.map(participant => (
                    <option key={participant} value={participant}>
                      Participant {participant}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Demographics</label>
                <select
                  value={demographicFilter}
                  onChange={(e) => setDemographicFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Demographics</option>
                  {demographicOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Level</label>
                <select
                  value={filters.engagement}
                  onChange={(e) => updateFilter('engagement', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="high">High (30+ min)</option>
                  <option value="medium">Medium (10-30 min)</option>
                  <option value="low">Low (&lt; 10 min)</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-800 mb-4">Additional Filters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Session Duration Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Duration (min)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.sessionDuration.min || ''}
                      onChange={(e) => updateFilter('sessionDuration', {
                        ...filters.sessionDuration,
                        min: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.sessionDuration.max || ''}
                      onChange={(e) => updateFilter('sessionDuration', {
                        ...filters.sessionDuration,
                        max: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.ageRange.min || ''}
                      onChange={(e) => updateFilter('ageRange', {
                        ...filters.ageRange,
                        min: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.ageRange.max || ''}
                      onChange={(e) => updateFilter('ageRange', {
                        ...filters.ageRange,
                        max: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {filterOptions.genders.map(gender => (
                      <label key={gender} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.gender.includes(gender)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilter('gender', [...filters.gender, gender]);
                            } else {
                              updateFilter('gender', filters.gender.filter(g => g !== gender));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{gender}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Device Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {filterOptions.deviceTypes.map(deviceType => (
                      <label key={deviceType} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.deviceType.includes(deviceType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilter('deviceType', [...filters.deviceType, deviceType]);
                            } else {
                              updateFilter('deviceType', filters.deviceType.filter(d => d !== deviceType));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{deviceType}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date Range</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.customDateRange.start || ''}
                      onChange={(e) => updateFilter('customDateRange', {
                        ...filters.customDateRange,
                        start: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.customDateRange.end || ''}
                      onChange={(e) => updateFilter('customDateRange', {
                        ...filters.customDateRange,
                        end: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reset All Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'sessions', label: 'Session Analysis', icon: Activity },
            { id: 'statistical', label: 'Statistical Charts', icon: Target },
            { id: 'demographics', label: 'Demographics', icon: Users },
            { id: 'insights', label: 'Insights', icon: Zap }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sessions"
              value={analytics.summary.totalSessions}
              subtitle={`${analytics.summary.comparisonMetrics.sessionChange >= 0 ? '+' : ''}${analytics.summary.comparisonMetrics.sessionChange.toFixed(1)}% vs prev ${analytics.summary.comparisonMetrics.periodLabel}`}
              icon={Activity}
              trend={{
                direction: analytics.summary.comparisonMetrics.sessionChange > 5 ? 'up' : 
                          analytics.summary.comparisonMetrics.sessionChange < -5 ? 'down' : 'stable',
                text: `${Math.abs(analytics.summary.comparisonMetrics.sessionChange).toFixed(1)}% change`
              }}
              color="blue"
            />
            <StatCard
              title="Unique Participants"
              value={analytics.summary.totalParticipants}
              subtitle={`${analytics.summary.comparisonMetrics.participantChange >= 0 ? '+' : ''}${analytics.summary.comparisonMetrics.participantChange.toFixed(1)}% vs prev ${analytics.summary.comparisonMetrics.periodLabel}`}
              icon={Users}
              trend={{
                direction: analytics.summary.comparisonMetrics.participantChange > 0 ? 'up' : 
                          analytics.summary.comparisonMetrics.participantChange < 0 ? 'down' : 'stable',
                text: `${Math.abs(analytics.summary.comparisonMetrics.participantChange).toFixed(1)}% change`
              }}
              color="green"
            />
            <StatCard
              title="Avg Session Duration"
              value={`${analytics.sessionAnalytics.mean.toFixed(1)}m`}
              subtitle={`Median: ${analytics.sessionAnalytics.median.toFixed(1)}m | ${analytics.summary.comparisonMetrics.durationChange >= 0 ? '+' : ''}${analytics.summary.comparisonMetrics.durationChange.toFixed(1)}% vs prev ${analytics.summary.comparisonMetrics.periodLabel}`}
              icon={Clock}
              trend={{
                direction: analytics.summary.comparisonMetrics.durationChange > 5 ? 'up' : 
                          analytics.summary.comparisonMetrics.durationChange < -5 ? 'down' : 'stable',
                text: `${Math.abs(analytics.summary.comparisonMetrics.durationChange).toFixed(1)}% change`
              }}
              color="purple"
            />
            <StatCard
              title="Engagement Trend"
              value={analytics.summary.engagementTrend}
              subtitle={`Based on ${dateRange === 'all' ? 'all-time' : `last ${dateRange}`} activity`}
              icon={TrendingUp}
              color="orange"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Duration Distribution</h3>
              <div className="h-64">
                <Bar data={sessionDurationChart} options={chartOptions} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity Trend</h3>
              <div className="h-64">
                <Line data={dailyTrendChart} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Analysis Tab */}
      {activeView === 'sessions' && (
        <div className="space-y-6">
          {/* Session Statistics */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics.sessionAnalytics.mean.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Mean (min)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900">{analytics.sessionAnalytics.median.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Median (min)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900">{analytics.sessionAnalytics.standardDeviation.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Std Dev</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900">{analytics.sessionAnalytics.percentiles.p75.toFixed(1)}</p>
                <p className="text-sm text-gray-500">75th %ile</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900">{analytics.sessionAnalytics.min}</p>
                <p className="text-sm text-gray-500">Min (min)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900">{analytics.sessionAnalytics.max}</p>
                <p className="text-sm text-gray-500">Max (min)</p>
              </div>
            </div>
          </div>

          {/* Hourly Usage Pattern */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Usage Pattern</h3>
            <div className="h-80">
              <Bar data={hourlyChart} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Statistical Charts Tab */}
      {activeView === 'statistical' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">Advanced Statistical Analysis</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Correlation analysis, histograms, time series decomposition, and cohort retention metrics.
                </p>
              </div>
            </div>
          </div>
          
          <StatisticalCharts 
            analytics={analytics}
            appUsageData={filteredData.appUsage}
            pretestData={filteredData.pretest}
            demographicsData={filteredData.demographics}
          />
        </div>
      )}

      {/* Demographics Tab */}
      {activeView === 'demographics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demographicCharts.slice(0, 6).map(({ field, chart }) => (
              <div key={field} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                  {field.replace(/_/g, ' ')}
                </h3>
                <div className="h-64">
                  <Doughnut data={chart} options={{ ...chartOptions, maintainAspectRatio: false }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeView === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
          
          {analytics.insights.length === 0 && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Generated</h3>
              <p className="text-gray-500">More data is needed to generate meaningful insights.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;