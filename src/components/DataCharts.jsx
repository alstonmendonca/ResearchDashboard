import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DataCharts = ({ appUsage, pretestData, demographicsData }) => {
  // Chart for app usage sessions by day
  const getAppUsageChartData = () => {
    if (!appUsage.data || appUsage.data.length === 0) return null;

    const sessionsByDay = {};
    appUsage.data.forEach(session => {
      if (session.created_at) {
        const date = new Date(session.created_at).toLocaleDateString();
        sessionsByDay[date] = (sessionsByDay[date] || 0) + 1;
      }
    });

    const labels = Object.keys(sessionsByDay).slice(-7); // Last 7 days
    const data = labels.map(date => sessionsByDay[date] || 0);

    return {
      labels,
      datasets: [
        {
          label: 'App Usage Sessions',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Chart for demographics by age group
  const getDemographicsChartData = () => {
    if (!demographicsData.data || demographicsData.data.length === 0) return null;

    const ageGroups = {};
    demographicsData.data.forEach(demo => {
      if (demo.age_group) {
        ageGroups[demo.age_group] = (ageGroups[demo.age_group] || 0) + 1;
      }
    });

    const labels = Object.keys(ageGroups);
    const data = Object.values(ageGroups);
    const colors = [
      'rgba(239, 68, 68, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(59, 130, 246, 0.8)',
      'rgba(251, 191, 36, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(236, 72, 153, 0.8)',
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
        },
      ],
    };
  };

  // Chart for pretest responses (registered nurses)
  const getPretestChartData = () => {
    if (!pretestData.data || pretestData.data.length === 0) return null;

    const registeredNurses = pretestData.data.filter(p => p.is_registered_nurse).length;
    const nonRegisteredNurses = pretestData.data.length - registeredNurses;

    return {
      labels: ['Registered Nurses', 'Non-Registered'],
      datasets: [
        {
          data: [registeredNurses, nonRegisteredNurses],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(156, 163, 175, 0.8)',
          ],
          borderWidth: 0,
        },
      ],
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
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 10
          }
        }
      }
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: {
            size: 10
          },
          padding: 10
        }
      },
      tooltip: {
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        }
      }
    },
  };

  const appUsageChartData = getAppUsageChartData();
  const demographicsChartData = getDemographicsChartData();
  const pretestChartData = getPretestChartData();

  if (appUsage.loading || pretestData.loading || demographicsData.loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* App Usage Sessions Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">App Usage Over Time</h4>
        <div className="h-48">
          {appUsageChartData ? (
            <Bar data={appUsageChartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No app usage data available
            </div>
          )}
        </div>
      </div>

      {/* Demographics Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Age Distribution</h4>
        <div className="h-48">
          {demographicsChartData ? (
            <Doughnut data={demographicsChartData} options={doughnutOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No demographics data available
            </div>
          )}
        </div>
      </div>

      {/* Pretest Responses Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Nurse Distribution</h4>
        <div className="h-48">
          {pretestChartData ? (
            <Doughnut data={pretestChartData} options={doughnutOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No pretest data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataCharts;