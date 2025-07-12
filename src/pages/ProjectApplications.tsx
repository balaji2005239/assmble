import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, Calendar, Check, X, MessageCircle, ArrowLeft, Star, Briefcase } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProjectApplications() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchProjectAndApplications();
  }, [id]);

  const fetchProjectAndApplications = async () => {
    try {
      const [projectResponse, applicationsResponse] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/applications`)
      ]);
      
      setProject(projectResponse.data);
      setApplications(applicationsResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: number, status: string) => {
    setUpdating(applicationId);
    try {
      await api.put(`/projects/applications/${applicationId}/status`, { status });
      toast.success(`Application ${status} successfully!`);
      fetchProjectAndApplications(); // Refresh data
    } catch (error: any) {
      const message = error.response?.data?.error || `Failed to ${status} application`;
      toast.error(message);
    } finally {
      setUpdating(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Project not found</h2>
        <Link to="/projects" className="text-blue-600 hover:text-blue-700">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="flex items-center space-x-4 mb-6">
          <Link
            to={`/projects/${project.id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">Manage applications for your project</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter((app: any) => app.status === 'accepted').length}
            </div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {applications.filter((app: any) => app.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {applications.length > 0 ? (
          applications.map((application: any) => (
            <div key={application.id} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-start space-x-4 mb-6">
                    {application.user.avatar_url ? (
                      <img
                        src={application.user.avatar_url}
                        alt={application.user.username}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={24} className="text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {application.user.full_name || application.user.username}
                        </h3>
                        <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">@{application.user.username}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <Calendar size={16} />
                          <span>Applied {formatDate(application.applied_at)}</span>
                        </div>
                        {application.user.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin size={16} />
                            <span>{application.user.location}</span>
                          </div>
                        )}
                        {application.user.experience && (
                          <div className="flex items-center space-x-1">
                            <Briefcase size={16} />
                            <span className="capitalize">{application.user.experience}</span>
                          </div>
                        )}
                      </div>

                      {application.user.bio && (
                        <p className="text-gray-600 mb-4">{application.user.bio}</p>
                      )}

                      {/* Skills */}
                      {application.user.skills && application.user.skills.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {application.user.skills.map((skill: any) => (
                              <span
                                key={skill.id}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Application Message */}
                      {application.message && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Application Message</h4>
                          <p className="text-gray-600">{application.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-3 lg:ml-8">
                  <Link
                    to={`/users/${application.user.id}`}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium"
                  >
                    View Profile
                  </Link>
                  
                  <Link
                    to={`/chat/${application.user.id}`}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors text-center font-medium flex items-center justify-center space-x-2"
                  >
                    <MessageCircle size={16} />
                    <span>Message</span>
                  </Link>

                  {application.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(application.id, 'accepted')}
                        disabled={updating === application.id}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        {updating === application.id ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(application.id, 'rejected')}
                        disabled={updating === application.id}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        {updating === application.id ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <>
                            <X size={16} />
                            <span>Reject</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600">
              When developers apply to your project, their applications will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}