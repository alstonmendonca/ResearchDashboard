import React from 'react';
import { Scatter, Line, Bar } from 'react-chartjs-2';
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StatisticalCharts = ({ analytics, appUsageData, pretestData, demographicsData }) => {
  // Correlation Matrix Data
  const correlationData = () => {
    if (!appUsageData || appUsageData.length < 10) return null;
    
    // Group data by participant
    const participantData = appUsageData.reduce((acc, session) => {
      if (session.participant_number && session.duration_minutes != null) {
        if (!acc[session.participant_number]) {
          acc[session.participant_number] = {
            sessionCount: 0,
            totalDuration: 0,
            avgDuration: 0,
            sessions: []
          };
        }
        acc[session.participant_number].sessionCount += 1;
        acc[session.participant_number].totalDuration += session.duration_minutes;
        acc[session.participant_number].sessions.push(session);
      }
      return acc;
    }, {});

    // Calculate averages
    Object.keys(participantData).forEach(participant => {
      const data = participantData[participant];
      data.avgDuration = data.totalDuration / data.sessionCount;
    });

    // Create scatter plot data for correlation analysis
    const scatterData = Object.values(participantData).map(data => ({
      x: data.sessionCount,
      y: data.avgDuration
    }));

    return {
      datasets: [{
        label: 'Session Count vs Avg Duration',
        data: scatterData,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  };

  // Histogram for session durations
  const histogramData = () => {
    if (!appUsageData) return null;
    
    const durations = appUsageData
      .map(s => s.duration_minutes)
      .filter(d => d != null && d > 0);
    
    if (durations.length === 0) return null;

    // Create bins
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const binCount = Math.min(15, Math.ceil(Math.sqrt(durations.length)));
    const binSize = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * binSize,
      end: min + (i + 1) * binSize,
      count: 0,
      label: `${Math.round(min + i * binSize)}-${Math.round(min + (i + 1) * binSize)}`
    }));

    // Fill bins
    durations.forEach(duration => {
      const binIndex = Math.min(Math.floor((duration - min) / binSize), binCount - 1);
      bins[binIndex].count++;
    });

    return {
      labels: bins.map(bin => bin.label),
      datasets: [{
        label: 'Frequency',
        data: bins.map(bin => bin.count),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    };
  };

  // Time series decomposition (trend, seasonality)
  const timeSeriesData = () => {
    if (!analytics.dailySessions || analytics.dailySessions.length < 7) return null;

    // Calculate moving average (trend)
    const windowSize = Math.min(7, Math.floor(analytics.dailySessions.length / 3));
    const movingAverage = analytics.dailySessions.map((point, index) => {
      if (index < windowSize - 1) return null;
      
      const window = analytics.dailySessions.slice(index - windowSize + 1, index + 1);
      const avg = window.reduce((sum, p) => sum + p.count, 0) / windowSize;
      return avg;
    });

    return {
      labels: analytics.dailySessions.map(d => d.date.toLocaleDateString()),
      datasets: [
        {
          label: 'Actual Sessions',
          data: analytics.dailySessions.map(d => d.count),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Trend (Moving Average)',
          data: movingAverage,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          borderDash: [5, 5]
        }
      ]
    };
  };

  // Box plot simulation using bar chart
  const boxPlotData = () => {
    if (!analytics.sessionAnalytics || analytics.sessionAnalytics.count === 0) return null;

    const stats = analytics.sessionAnalytics;
    return {
      labels: ['Session Duration Distribution'],
      datasets: [
        {
          label: 'Min',
          data: [stats.min],
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        },
        {
          label: '25th Percentile',
          data: [stats.percentiles.p25],
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1
        },
        {
          label: 'Median',
          data: [stats.median],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        },
        {
          label: '75th Percentile',
          data: [stats.percentiles.p75],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: 'Max',
          data: [stats.max],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  // Engagement cohort analysis
  const cohortData = () => {
    if (!appUsageData || appUsageData.length < 20) return null;

    // Group participants by their first session date (week)
    const cohorts = {};
    const participantFirstSession = {};

    appUsageData.forEach(session => {
      if (session.participant_number && session.created_at) {
        const sessionDate = new Date(session.created_at);
        if (!participantFirstSession[session.participant_number] || 
            sessionDate < participantFirstSession[session.participant_number]) {
          participantFirstSession[session.participant_number] = sessionDate;
        }
      }
    });

    // Create weekly cohorts
    Object.entries(participantFirstSession).forEach(([participant, firstDate]) => {
      const weekStart = new Date(firstDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      const cohortKey = weekStart.toISOString().split('T')[0];
      
      if (!cohorts[cohortKey]) cohorts[cohortKey] = [];
      cohorts[cohortKey].push(participant);
    });

    // Calculate retention for each cohort
    const cohortLabels = Object.keys(cohorts).sort().slice(0, 8); // Last 8 weeks
    const retentionData = cohortLabels.map(cohortKey => {
      const cohortParticipants = cohorts[cohortKey];
      const cohortStartDate = new Date(cohortKey);
      
      // Count how many are still active after 1 week, 2 weeks, etc.
      const retention = [100]; // Week 0 is always 100%
      
      for (let week = 1; week <= 4; week++) {
        const weekDate = new Date(cohortStartDate);
        weekDate.setDate(weekDate.getDate() + week * 7);
        
        const activeCount = cohortParticipants.filter(participant => {
          return appUsageData.some(session => 
            session.participant_number === participant &&
            new Date(session.created_at) >= weekDate &&
            new Date(session.created_at) < new Date(weekDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          );
        }).length;
        
        retention.push((activeCount / cohortParticipants.length) * 100);
      }
      
      return retention;
    });

    return {
      labels: ['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: cohortLabels.map((cohortKey, index) => ({
        label: `Cohort ${new Date(cohortKey).toLocaleDateString()}`,
        data: retentionData[index] || [],
        borderColor: `hsl(${index * 45}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 45}, 70%, 50%, 0.1)`,
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }))
    };
  };

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

  const scatterOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        title: {
          display: true,
          text: 'Number of Sessions'
        }
      },
      y: {
        ...chartOptions.scales.y,
        title: {
          display: true,
          text: 'Average Duration (minutes)'
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Session Duration Histogram */}
      {histogramData() && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Duration Distribution</h3>
          <div className="h-80">
            <Bar data={histogramData()} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Correlation Scatter Plot */}
      {correlationData() && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions vs Duration Correlation</h3>
          <div className="h-80">
            <Scatter data={correlationData()} options={scatterOptions} />
          </div>
        </div>
      )}

      {/* Time Series with Trend */}
      {timeSeriesData() && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Series with Trend Analysis</h3>
          <div className="h-80">
            <Line data={timeSeriesData()} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Statistical Summary (Box Plot Style) */}
      {boxPlotData() && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistical Distribution Summary</h3>
          <div className="h-80">
            <Bar data={boxPlotData()} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Cohort Retention Analysis */}
      {cohortData() && cohortData().datasets.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cohort Retention Analysis</h3>
          <div className="h-80">
            <Line data={cohortData()} options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  max: 100,
                  title: {
                    display: true,
                    text: 'Retention Rate (%)'
                  }
                }
              }
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticalCharts;