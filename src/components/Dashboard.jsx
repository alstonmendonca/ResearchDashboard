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
import { useAppUsageSessions, usePretestResponses, useDemographicSurveys, useActiveParticipants, usePosttestResponses } from '../hooks/useSupabaseData';

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all'); // 'all', 'Intervention', 'Control'

  // Fetch data from Supabase
  const appUsage = useAppUsageSessions();
  const pretestData = usePretestResponses();
  const posttestData = usePosttestResponses();
  const demographicsData = useDemographicSurveys();
  const participants = useActiveParticipants(); // Only active participants (id_used = true)

  // Filter data based on selected group
  const getFilteredData = () => {
    // Create a map of participant numbers to groups
    const participantGroupMap = participants.data.reduce((map, p) => {
      map[p.participant_number] = p.Group;
      return map;
    }, {});

    // Enrich pretest data with group information
    const enrichedPretestData = pretestData.data.map(p => ({
      ...p,
      group: participantGroupMap[p.participant_number] || 'Unknown'
    }));

    // Posttest data already has group_assignment field
    const enrichedPosttestData = posttestData.data.map(p => ({
      ...p,
      group: p.group_assignment || 'Unknown'
    }));

    if (groupFilter === 'all') {
      return {
        participants: participants.data,
        appUsage: appUsage.data,
        pretestData: enrichedPretestData,
        posttestData: enrichedPosttestData,
        demographicsData: demographicsData.data
      };
    }

    const participantNumbers = participants.data
      .filter(p => p.Group === groupFilter)
      .map(p => p.participant_number);

    return {
      participants: participants.data.filter(p => p.Group === groupFilter),
      appUsage: appUsage.data.filter(s => participantNumbers.includes(s.participant_number)),
      pretestData: enrichedPretestData.filter(p => participantNumbers.includes(p.participant_number)),
      posttestData: enrichedPosttestData.filter(p => p.group_assignment === groupFilter),
      demographicsData: demographicsData.data.filter(d => participantNumbers.includes(d.participant_id))
    };
  };

  const filteredData = getFilteredData();

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
    
    // Add Posttest Responses sheet
    if (posttestData.data && posttestData.data.length > 0) {
      const posttestSheet = XLSX.utils.json_to_sheet(posttestData.data);
      XLSX.utils.book_append_sheet(workbook, posttestSheet, 'Posttest Responses');
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
    { id: 'posttest', label: 'Posttest Responses', icon: FileText, color: 'text-blue-600' },
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
                {activeTab === 'posttest' && 'Post-test response analysis'}
                {activeTab === 'demographics' && 'Participant demographic information'}
              </p>
            </div>
          </div>
          
          {/* Group Filter */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Group:</label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-white"
            >
              <option value="all">All Participants</option>
              <option value="Intervention">Intervention Group</option>
              <option value="Control">Control Group</option>
            </select>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Active Participants</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {participants.loading ? '...' : filteredData.participants.length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">ID used & registered</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Pretest Responses</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {pretestData.loading ? '...' : filteredData.pretestData.length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Baseline assessments</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Posttest Responses</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {posttestData.loading ? '...' : filteredData.posttestData.length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Follow-up assessments</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">App Sessions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {appUsage.loading ? '...' : filteredData.appUsage.length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Total usage sessions</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Activity className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Avg Session Time</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {appUsage.loading ? '...' : 
                            filteredData.appUsage.length > 0 ? 
                              Math.round(filteredData.appUsage.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / filteredData.appUsage.length) + 'm'
                              : '0m'
                          }
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Average duration</p>
                      </div>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-blue-900" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Research Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Group Distribution */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Distribution</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Intervention Group</span>
                        <span className="text-lg font-bold text-blue-900">
                          {participants.loading ? '...' : participants.data.filter(p => p.Group === 'Intervention').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Control Group</span>
                        <span className="text-lg font-bold text-blue-900">
                          {participants.loading ? '...' : participants.data.filter(p => p.Group === 'Control').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-gray-700">Total Active</span>
                        <span className="text-lg font-bold text-gray-900">
                          {participants.loading ? '...' : participants.data.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WHO-5 Well-Being Score */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">WHO-5 Well-Being</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Score</span>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.loading || filteredData.pretestData.length === 0 ? '...' : 
                            ((filteredData.pretestData.reduce((sum, p) => 
                              sum + (p.who5_cheerful + p.who5_calm + p.who5_active + p.who5_rested + p.who5_interested), 0
                            ) / filteredData.pretestData.length / 5) * 25).toFixed(1)
                          }%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Responses</span>
                        <span className="text-lg font-bold text-blue-900">
                          {filteredData.pretestData.length}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">Scale: 0-100% (higher is better)</p>
                      </div>
                    </div>
                  </div>

                  {/* PSS-4 Stress Score */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PSS-4 Stress Level</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Score</span>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.loading || filteredData.pretestData.length === 0 ? '...' : 
                            (filteredData.pretestData.reduce((sum, p) => 
                              sum + (p.pss4_unable_control + (5-p.pss4_confident_handle) + (5-p.pss4_going_your_way) + p.pss4_difficulties_piling), 0
                            ) / filteredData.pretestData.length).toFixed(1)
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Responses</span>
                        <span className="text-lg font-bold text-blue-900">
                          {filteredData.pretestData.length}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">Scale: 0-16 (higher = more stress)</p>
                      </div>
                    </div>
                  </div>

                  {/* Nurse Demographics */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Registered Nurses</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">RN Count</span>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.loading ? '...' : filteredData.pretestData.filter(p => p.is_registered_nurse).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Non-RN Count</span>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.loading ? '...' : filteredData.pretestData.filter(p => !p.is_registered_nurse).length}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">Professional qualification status</p>
                      </div>
                    </div>
                  </div>

                  {/* Consent Status */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Consent & Compliance</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Consented</span>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.loading ? '...' : filteredData.pretestData.filter(p => p.provides_consent).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Understands Voluntary</span>
                        <span className="text-lg font-bold text-blue-900">
                          {pretestData.loading ? '...' : filteredData.pretestData.filter(p => p.understands_voluntary).length}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">Ethics compliance tracking</p>
                      </div>
                    </div>
                  </div>

                  {/* Burnout Status */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Burnout Levels (Pretest)</h3>
                    <div className="space-y-2">
                      {pretestData.loading ? '...' : (() => {
                        const burnoutCounts = filteredData.pretestData.reduce((acc, p) => {
                          acc[p.burnout_level] = (acc[p.burnout_level] || 0) + 1;
                          return acc;
                        }, {});
                        return Object.entries(burnoutCounts).map(([level, count]) => (
                          <div key={level} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 capitalize">{level?.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-blue-900">{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Posttest Statistics */}
                <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-blue-900">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-6 h-6 text-blue-900 mr-2" />
                    Post-Test Response Statistics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Responses */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Responses</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {posttestData.loading ? '...' : filteredData.posttestData.length}
                      </p>
                    </div>

                    {/* WHO-5 Post Score */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">WHO-5 Post Score</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {posttestData.loading || filteredData.posttestData.length === 0 ? '...' : 
                          ((filteredData.posttestData.reduce((sum, p) => 
                            sum + (p.who5_cheerful + p.who5_calm + p.who5_active + p.who5_rested + p.who5_interested), 0
                          ) / filteredData.posttestData.length / 5) * 25).toFixed(1)
                        }%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Well-being index</p>
                    </div>

                    {/* PSS-4 Post Score */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">PSS-4 Post Score</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {posttestData.loading || filteredData.posttestData.length === 0 ? '...' : 
                          (filteredData.posttestData.reduce((sum, p) => 
                            sum + (p.pss4_unable_control + (5-p.pss4_confident_handle) + (5-p.pss4_going_your_way) + p.pss4_difficulties_piling), 0
                          ) / filteredData.posttestData.length).toFixed(1)
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Stress level</p>
                    </div>

                    {/* Brief COPE Average */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Avg COPE Score</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {posttestData.loading || filteredData.posttestData.length === 0 ? '...' : 
                          (() => {
                            const total = filteredData.posttestData.reduce((sum, p) => {
                              const copeSum = (
                                (p.cope_concentrating || p.cope_concentrating_efforts || 0) + 
                                (p.cope_taking_action || 0) + 
                                (p.cope_strategy || 0) + 
                                (p.cope_thinking_steps || 0) + 
                                (p.cope_different_light || 0) + 
                                (p.cope_looking_good || 0) + 
                                (p.cope_accepting_reality || 0) + 
                                (p.cope_learning_live || 0) + 
                                (p.cope_emotional_support || 0) + 
                                (p.cope_comfort_understanding || 0) + 
                                (p.cope_work_activities || 0) + 
                                (p.cope_movies_tv_reading || 0) + 
                                (p.cope_criticizing_myself || 0) + 
                                (p.cope_blaming_myself || 0)
                              );
                              return sum + copeSum;
                            }, 0);
                            return (total / filteredData.posttestData.length / 14).toFixed(1);
                          })()
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Coping strategies</p>
                    </div>
                  </div>
                </div>

                {/* Posttest Detailed Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Posttest Burnout Status */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Burnout Levels (Posttest)</h3>
                    <div className="space-y-2">
                      {posttestData.loading ? '...' : (() => {
                        const burnoutCounts = filteredData.posttestData.reduce((acc, p) => {
                          acc[p.burnout_level] = (acc[p.burnout_level] || 0) + 1;
                          return acc;
                        }, {});
                        return Object.entries(burnoutCounts).map(([level, count]) => (
                          <div key={level} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 capitalize">{level?.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-blue-900">{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Posttest by Group */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Posttest by Group</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Intervention</span>
                        <span className="text-lg font-bold text-blue-900">
                          {posttestData.loading ? '...' : filteredData.posttestData.filter(p => p.group_assignment === 'Intervention').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Control</span>
                        <span className="text-lg font-bold text-blue-900">
                          {posttestData.loading ? '...' : filteredData.posttestData.filter(p => p.group_assignment === 'Control').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                        <span className="text-lg font-bold text-gray-900">
                          {participants.loading || posttestData.loading ? '...' : 
                            participants.data.length > 0 ? 
                              Math.round((filteredData.posttestData.length / participants.data.length) * 100) + '%'
                              : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Statistics */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">App Feedback</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">With Comments</span>
                        <span className="text-lg font-bold text-blue-900">
                          {posttestData.loading ? '...' : 
                            filteredData.posttestData.filter(p => p.additional_comments && p.additional_comments.trim() !== '' && p.additional_comments.toLowerCase() !== 'nil').length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Feature Feedback</span>
                        <span className="text-lg font-bold text-blue-900">
                          {posttestData.loading ? '...' : 
                            filteredData.posttestData.filter(p => p.app_helpful_features && p.app_helpful_features.trim() !== '').length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Technical Issues</span>
                        <span className="text-lg font-bold text-blue-900">
                          {posttestData.loading ? '...' : 
                            filteredData.posttestData.filter(p => p.app_technical_issues && p.app_technical_issues.trim() !== '' && p.app_technical_issues.toLowerCase() !== 'nothing').length
                          }
                        </span>
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
                        posttestData.refetch();
                        demographicsData.refetch();
                        participants.refetch();
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
                appUsageData={filteredData.appUsage}
                pretestData={filteredData.pretestData}
                demographicsData={filteredData.demographicsData}
              />
            )}

            {activeTab === 'app-usage' && (
              <EnhancedDataTable
                data={filteredData.appUsage}
                loading={appUsage.loading}
                error={appUsage.error}
                title="App Usage Sessions"
                type="app-usage"
              />
            )}

            {activeTab === 'pretest' && (
              <EnhancedDataTable
                data={filteredData.pretestData}
                loading={pretestData.loading}
                error={pretestData.error}
                title="Pretest Responses"
                type="pretest"
              />
            )}

            {activeTab === 'posttest' && (
              <div className="space-y-6">
                <EnhancedDataTable
                  data={filteredData.posttestData}
                  loading={posttestData.loading}
                  error={posttestData.error}
                  title="Posttest Responses"
                  type="posttest"
                />

                {/* Posttest Statistics & Analytics */}
                {!posttestData.loading && filteredData.posttestData.length > 0 && (
                  <>
                    {/* Summary Statistics */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                        <BarChart3 className="w-5 h-5 text-blue-900 mr-2" />
                        Posttest Response Analytics
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* WHO-5 Distribution */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">WHO-5 Well-Being</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Average</span>
                              <span className="text-lg font-bold text-blue-900">
                                {((filteredData.posttestData.reduce((sum, p) => 
                                  sum + (p.who5_cheerful + p.who5_calm + p.who5_active + p.who5_rested + p.who5_interested), 0
                                ) / filteredData.posttestData.length / 5) * 25).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Highest</span>
                              <span className="text-sm font-bold text-gray-700">
                                {Math.max(...filteredData.posttestData.map(p => 
                                  ((p.who5_cheerful + p.who5_calm + p.who5_active + p.who5_rested + p.who5_interested) / 5) * 25
                                )).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Lowest</span>
                              <span className="text-sm font-bold text-gray-700">
                                {Math.min(...filteredData.posttestData.map(p => 
                                  ((p.who5_cheerful + p.who5_calm + p.who5_active + p.who5_rested + p.who5_interested) / 5) * 25
                                )).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* PSS-4 Distribution */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">PSS-4 Stress Level</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Average</span>
                              <span className="text-lg font-bold text-blue-900">
                                {(filteredData.posttestData.reduce((sum, p) => 
                                  sum + (p.pss4_unable_control + (5-p.pss4_confident_handle) + (5-p.pss4_going_your_way) + p.pss4_difficulties_piling), 0
                                ) / filteredData.posttestData.length).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Highest</span>
                              <span className="text-sm font-bold text-gray-700">
                                {Math.max(...filteredData.posttestData.map(p => 
                                  p.pss4_unable_control + (5-p.pss4_confident_handle) + (5-p.pss4_going_your_way) + p.pss4_difficulties_piling
                                )).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Lowest</span>
                              <span className="text-sm font-bold text-gray-700">
                                {Math.min(...filteredData.posttestData.map(p => 
                                  p.pss4_unable_control + (5-p.pss4_confident_handle) + (5-p.pss4_going_your_way) + p.pss4_difficulties_piling
                                )).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Burnout Distribution */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Burnout Status</h4>
                          <div className="space-y-2">
                            {(() => {
                              const burnoutCounts = filteredData.posttestData.reduce((acc, p) => {
                                acc[p.burnout_level] = (acc[p.burnout_level] || 0) + 1;
                                return acc;
                              }, {});
                              return Object.entries(burnoutCounts).map(([level, count]) => (
                                <div key={level} className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600 capitalize">{level?.replace(/_/g, ' ')}</span>
                                  <span className="text-sm font-bold text-blue-900">{count}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        {/* Group Comparison */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Group Breakdown</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Intervention</span>
                              <span className="text-lg font-bold text-blue-900">
                                {filteredData.posttestData.filter(p => p.group_assignment === 'Intervention').length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Control</span>
                              <span className="text-lg font-bold text-blue-900">
                                {filteredData.posttestData.filter(p => p.group_assignment === 'Control').length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-xs text-gray-600">Total</span>
                              <span className="text-sm font-bold text-gray-700">
                                {filteredData.posttestData.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comparative Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* WHO-5 Component Breakdown */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 className="text-md font-bold text-gray-900 mb-4">WHO-5 Component Scores</h4>
                        <div className="space-y-3">
                          {[
                            { key: 'who5_cheerful', label: 'Cheerful & Good Spirits' },
                            { key: 'who5_calm', label: 'Calm & Relaxed' },
                            { key: 'who5_active', label: 'Active & Vigorous' },
                            { key: 'who5_rested', label: 'Fresh & Rested' },
                            { key: 'who5_interested', label: 'Interested in Things' }
                          ].map(({ key, label }) => {
                            const avg = (filteredData.posttestData.reduce((sum, p) => sum + (p[key] || 0), 0) / filteredData.posttestData.length).toFixed(2);
                            const percentage = (avg / 5) * 100;
                            return (
                              <div key={key}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm text-gray-700">{label}</span>
                                  <span className="text-sm font-bold text-blue-900">{avg}/5</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-900 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* PSS-4 Component Breakdown */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 className="text-md font-bold text-gray-900 mb-4">PSS-4 Stress Components</h4>
                        <div className="space-y-3">
                          {[
                            { key: 'pss4_unable_control', label: 'Unable to Control', reversed: false },
                            { key: 'pss4_confident_handle', label: 'Confident Handling', reversed: true },
                            { key: 'pss4_going_your_way', label: 'Things Going Your Way', reversed: true },
                            { key: 'pss4_difficulties_piling', label: 'Difficulties Piling Up', reversed: false }
                          ].map(({ key, label, reversed }) => {
                            const avg = (filteredData.posttestData.reduce((sum, p) => {
                              const val = p[key] || 0;
                              return sum + (reversed ? (5 - val) : val);
                            }, 0) / filteredData.posttestData.length).toFixed(2);
                            const percentage = (avg / 5) * 100;
                            return (
                              <div key={key}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm text-gray-700">{label}</span>
                                  <span className="text-sm font-bold text-blue-900">{avg}/5</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-900 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* COPE Strategies Analysis */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h4 className="text-md font-bold text-gray-900 mb-4">Brief COPE Coping Strategies</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { key: 'cope_concentrating', altKey: 'cope_concentrating_efforts', label: 'Concentrating Efforts' },
                          { key: 'cope_taking_action', label: 'Taking Action' },
                          { key: 'cope_strategy', label: 'Strategy Planning' },
                          { key: 'cope_thinking_steps', label: 'Thinking About Steps' },
                          { key: 'cope_different_light', label: 'Different Perspective' },
                          { key: 'cope_looking_good', label: 'Looking for Positives' },
                          { key: 'cope_accepting_reality', label: 'Accepting Reality' },
                          { key: 'cope_learning_live', label: 'Learning to Live With It' },
                          { key: 'cope_emotional_support', label: 'Seeking Emotional Support' },
                          { key: 'cope_comfort_understanding', label: 'Comfort & Understanding' },
                          { key: 'cope_work_activities', label: 'Work/Activities' },
                          { key: 'cope_movies_tv_reading', label: 'Entertainment/Reading' },
                          { key: 'cope_criticizing_myself', label: 'Self-Criticism' },
                          { key: 'cope_blaming_myself', label: 'Self-Blame' }
                        ].map(({ key, altKey, label }) => {
                          const avg = (filteredData.posttestData.reduce((sum, p) => 
                            sum + (p[key] || p[altKey] || 0), 0
                          ) / filteredData.posttestData.length).toFixed(2);
                          const percentage = (avg / 4) * 100;
                          return (
                            <div key={key} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex justify-between mb-2">
                                <span className="text-xs text-gray-600">{label}</span>
                                <span className="text-sm font-bold text-blue-900">{avg}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-900 h-1.5 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Qualitative Feedback Summary */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h4 className="text-md font-bold text-gray-900 mb-4">App Feedback Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Responses with Comments</h5>
                          <p className="text-3xl font-bold text-blue-900">
                            {filteredData.posttestData.filter(p => 
                              p.additional_comments && p.additional_comments.trim() !== '' && 
                              p.additional_comments.toLowerCase() !== 'nil' && 
                              p.additional_comments.toLowerCase() !== 'nothing'
                            ).length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {((filteredData.posttestData.filter(p => 
                              p.additional_comments && p.additional_comments.trim() !== '' && 
                              p.additional_comments.toLowerCase() !== 'nil' && 
                              p.additional_comments.toLowerCase() !== 'nothing'
                            ).length / filteredData.posttestData.length) * 100).toFixed(1)}% of responses
                          </p>
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Helpful Features Mentioned</h5>
                          <p className="text-3xl font-bold text-blue-900">
                            {filteredData.posttestData.filter(p => 
                              p.app_helpful_features && p.app_helpful_features.trim() !== '' &&
                              p.app_helpful_features.toLowerCase() !== 'nil' &&
                              p.app_helpful_features.toLowerCase() !== 'nothing'
                            ).length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Feature feedback provided
                          </p>
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Technical Issues Reported</h5>
                          <p className="text-3xl font-bold text-blue-900">
                            {filteredData.posttestData.filter(p => 
                              p.app_technical_issues && p.app_technical_issues.trim() !== '' &&
                              p.app_technical_issues.toLowerCase() !== 'nil' &&
                              p.app_technical_issues.toLowerCase() !== 'nothing'
                            ).length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Issues need attention
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'demographics' && (
              <EnhancedDataTable
                data={filteredData.demographicsData}
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