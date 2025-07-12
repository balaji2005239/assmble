import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, CheckCircle, XCircle, Clock, Briefcase, Users } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [hackathonApplications, setHackathonApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const [projectApps, hackathonApps] = await Promise.all([
        api.get('/projects/applications/my'),
        api.get('/hackathons/applications/my')
      ]);
      
      setApplications(projectApps.data);
      setHackathonApplications(hackathonApps.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-1">Track your project and hackathon applications</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'projects'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Briefcase size={16} />
            <span>Project Applications ({applications.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('hackathons')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'hackathons'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={16} />
            <span>Team Applications ({hackathonApplications.length})</span>
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {activeTab === 'projects' ? (
          applications.length > 0 ? (
            applications.map((application: any) => (
              <div key={application.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {application.project.name}
                      </h3>
                      <span className={`px-3 py-1 text-sm rounded-full border flex items-center space-x-1 ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="capitalize">{application.status}</span>
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{application.project.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar size={16} />
                        <span>Applied {formatDate(application.applied_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User size={16} />
                        <span>Owner: {application.project.owner.username}</span>
                      </div>
                    </div>

                    {application.message && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700">
                          <strong>Your message:</strong> {application.message}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6">
                    <Link
                      to={`/projects/${application.project.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Project
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-12 shadow-sm text-center">
              <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No project applications</h3>
              <p className="text-gray-600 mb-4">You haven't applied to any projects yet.</p>
              <Link
                to="/projects"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Projects
              </Link>
            </div>
          )
        ) : (
          hackathonApplications.length > 0 ? (
            hackathonApplications.map((application: any) => (
              <div key={application.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {application.hackathon.title}
                      </h3>
                      <span className={`px-3 py-1 text-sm rounded-full border flex items-center space-x-1 ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="capitalize">{application.status}</span>
                      </span>
                    </div>
                    
                    <p className="text-purple-600 font-medium mb-2">{application.hackathon.hackathon_name}</p>
                    <p className="text-gray-600 mb-4">{application.hackathon.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar size={16} />
                        <span>Applied {formatDate(application.applied_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User size={16} />
                        <span>Owner: {application.hackathon.owner.username}</span>
                      </div>
                    </div>

                    {application.message && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700">
                          <strong>Your message:</strong> {application.message}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6">
                    <Link
                      to={`/hackathons/${application.hackathon.id}`}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      View Team Search
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-12 shadow-sm text-center">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No team applications</h3>
              <p className="text-gray-600 mb-4">You haven't applied to join any teams yet.</p>
              <Link
                to="/hackathons"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Find Teams
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}