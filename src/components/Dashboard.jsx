import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  FileText, 
  LogOut,
  Menu,
  X,
  Settings,
  Search,
  Target
} from 'lucide-react';
import * as XLSX from 'xlsx';
import DataTable from './DataTable';
import EnhancedDataTable from './EnhancedDataTable';
import DataCharts from './DataCharts';
import AnalyticsDashboard from './AnalyticsDashboard';
import { useAppUsageSessions, usePretestResponses, useDemographicSurveys } from '../hooks/useSupabaseData';

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch data from Supabase
  const appUsage = useAppUsageSessions();
  const pretestData = usePretestResponses();
  const demographicsData = useDemographicSurveys();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const exportAllDataToExcel = () => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Add App Usage Sessions sheet
    if (appUsage.data && appUsage.data.length > 0) {
      const appUsageSheet = XLSX.utils.json_to_sheet(appUsage.data);
      XLSX.utils.book_append_sheet(workbook, appUsageSheet, 'App Usage Sessions');
    }
    
    // Add Pretest Responses sheet
    if (pretestData.data && pretestData.data.length > 0) {
      const pretestSheet = XLSX.utils.json_to_sheet(pretestData.data);
      XLSX.utils.book_append_sheet(workbook, pretestSheet, 'Pretest Responses');
    }
    
    // Add Demographics sheet
    if (demographicsData.data && demographicsData.data.length > 0) {
      const demographicsSheet = XLSX.utils.json_to_sheet(demographicsData.data);
      XLSX.utils.book_append_sheet(workbook, demographicsSheet, 'Demographics');
    }
    
    // Add summary sheet
    const summaryData = [
      { Metric: 'Total App Sessions', Value: appUsage.data?.length || 0 },
      { Metric: 'Total Pretest Responses', Value: pretestData.data?.length || 0 },
      { Metric: 'Total Demographics', Value: demographicsData.data?.length || 0 },
      { Metric: 'Average Session Duration (minutes)', Value: appUsage.data?.length > 0 ? 
          Math.round(appUsage.data.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / appUsage.data.length) : 0 },
      { Metric: 'Registered Nurses', Value: pretestData.data?.filter(p => p.is_registered_nurse).length || 0 },
      { Metric: 'Export Date', Value: new Date().toLocaleString() }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Generate filename with current date
    const filename = `research_dashboard_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save the file
    XLSX.writeFile(workbook, filename);
  };

  // Column definitions for each table
  const appUsageColumns = [
    { key: 'id', label: 'ID' },
    { key: 'participant_number', label: 'Participant' },
    { key: 'session_start', label: 'Session Start', render: formatDate },
    { key: 'session_end', label: 'Session End', render: formatDate },
    { key: 'duration_minutes', label: 'Duration', render: formatDuration },
    { key: 'app_version', label: 'App Version' },
    { key: 'created_at', label: 'Created', render: formatDate }
  ];

  const pretestColumns = [
    { key: 'id', label: 'ID' },
    { key: 'participant_number', label: 'Participant' },
    { key: 'is_registered_nurse', label: 'Registered Nurse', render: (val) => val ? 'Yes' : 'No' },
    { key: 'provides_comfort', label: 'Provides Comfort', render: (val) => val ? 'Yes' : 'No' },
    { key: 'understands_voluntary', label: 'Understands Voluntary', render: (val) => val ? 'Yes' : 'No' },
    { key: 'which_cheerful', label: 'Cheerful Rating' },
    { key: 'which_calm', label: 'Calm Rating' },
    { key: 'which_active', label: 'Active Rating' },
    { key: 'which_interested', label: 'Interested Rating' },
    { key: 'created_at', label: 'Created', render: formatDate }
  ];

  const demographicsColumns = [
    { key: 'id', label: 'ID' },
    { key: 'participant_id', label: 'Participant ID' },
    { key: 'sample_code', label: 'Sample Code' },
    { key: 'age_group', label: 'Age Group' },
    { key: 'gender', label: 'Gender' },
    { key: 'marital_status', label: 'Marital Status' },
    { key: 'educational_qualification', label: 'Education' },
    { key: 'designation', label: 'Designation' },
    { key: 'income_level', label: 'Income Level' },
    { key: 'years_experience', label: 'Years Experience' },
    { key: 'working_unit', label: 'Working Unit' },
    { key: 'work_shift', label: 'Work Shift' },
    { key: 'created_at', label: 'Created', render: formatDate }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-600' },
    { id: 'analytics', label: 'Advanced Analytics', icon: Target, color: 'text-indigo-600' },
    { id: 'app-usage', label: 'App Usage Sessions', icon: Activity, color: 'text-green-600' },
    { id: 'pretest', label: 'Pretest Responses', icon: FileText, color: 'text-purple-600' },
    { id: 'demographics', label: 'Demographics', icon: Users, color: 'text-orange-600' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col border-r border-gray-200`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-blue-900 lg:justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-900" />
            </div>
            <h1 className="text-xl font-bold text-white">SHANTHI Research Portal</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all group ${
                  activeTab === item.id
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {item.label}
                {activeTab === item.id && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 mb-3 p-3 bg-white rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-sm text-gray-500">
                {activeTab === 'overview' && 'Dashboard overview and analytics'}
                {activeTab === 'app-usage' && 'Application usage session data'}
                {activeTab === 'pretest' && 'Pre-test response analysis'}
                {activeTab === 'demographics' && 'Participant demographic information'}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">App Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">{appUsage.loading ? '...' : appUsage.data.length}</p>
                        <p className="text-xs text-gray-600 mt-1">↗ +12% from last week</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Activity className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Pretest Responses</p>
                        <p className="text-2xl font-bold text-gray-900">{pretestData.loading ? '...' : pretestData.data.length}</p>
                        <p className="text-xs text-gray-600 mt-1">↗ +8% from last week</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Demographics</p>
                        <p className="text-2xl font-bold text-gray-900">{demographicsData.loading ? '...' : demographicsData.data.length}</p>
                        <p className="text-xs text-gray-600 mt-1">↗ +5% from last week</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Avg Session Time</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {appUsage.loading ? '...' : 
                            appUsage.data.length > 0 ? 
                              Math.round(appUsage.data.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / appUsage.data.length) + 'm'
                              : '0m'
                          }
                        </p>
                        <p className="text-xs text-orange-600 mt-1">↗ +3% from last week</p>
                      </div>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="flex items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <Search className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Search Data</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        appUsage.refetch();
                        pretestData.refetch();
                        demographicsData.refetch();
                      }}
                      className="flex items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="text-center">
                        <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Refresh All</p>
                      </div>
                    </button>
                    <button 
                      onClick={exportAllDataToExcel}
                      className="flex items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="text-center">
                        <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Export Excel</p>
                      </div>
                    </button>
                    <button className="flex items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <Settings className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Settings</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Charts Section - Compact */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Data Analytics</h3>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-xs font-medium text-white bg-blue-900 rounded-lg">7 Days</button>
                    </div>
                  </div>
                  <DataCharts 
                    appUsage={appUsage}
                    pretestData={pretestData}
                    demographicsData={demographicsData}
                  />
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
                    <div className="space-y-3">
                      {appUsage.data?.slice(0, 5).map((session, index) => (
                        <div key={session.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <Activity className="w-4 h-4 text-blue-900" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Participant {session.participant_number}</p>
                              <p className="text-xs text-gray-500">
                                {session.duration_minutes ? `${session.duration_minutes}m` : 'Duration unknown'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No recent sessions</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Summary</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">T</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Total Records</p>
                            <p className="text-xs text-gray-600">All data combined</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-blue-900">
                          {(appUsage.data?.length || 0) + (pretestData.data?.length || 0) + (demographicsData.data?.length || 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">R</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Registered Nurses</p>
                            <p className="text-xs text-gray-600">Professional healthcare</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.data?.filter(p => p.is_registered_nurse).length || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">A</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Active Today</p>
                            <p className="text-xs text-gray-600">Recent activity</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-blue-900">
                          {appUsage.data?.filter(session => {
                            const today = new Date().toDateString();
                            const sessionDate = session.created_at ? new Date(session.created_at).toDateString() : null;
                            return sessionDate === today;
                          }).length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                appUsageData={appUsage.data}
                pretestData={pretestData.data}
                demographicsData={demographicsData.data}
              />
            )}

            {activeTab === 'app-usage' && (
              <EnhancedDataTable
                data={appUsage.data}
                loading={appUsage.loading}
                error={appUsage.error}
                title="App Usage Sessions"
                type="app-usage"
              />
            )}

            {activeTab === 'pretest' && (
              <EnhancedDataTable
                data={pretestData.data}
                loading={pretestData.loading}
                error={pretestData.error}
                title="Pretest Responses"
                type="pretest"
              />
            )}

            {activeTab === 'demographics' && (
              <EnhancedDataTable
                data={demographicsData.data}
                loading={demographicsData.loading}
                error={demographicsData.error}
                title="Demographic Surveys"
                type="demographics"
              />
            )}
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;