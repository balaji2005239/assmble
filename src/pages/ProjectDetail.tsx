import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, ExternalLink, Github, Globe, MapPin, MessageCircle, Star, GitBranch, Send, Bookmark, BookmarkCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);

      // Check if project is bookmarked
      try {
        const bookmarksResponse = await api.get('/projects/bookmarks');
        const bookmarkedIds = bookmarksResponse.data.map((p: any) => p.id);
        setIsBookmarked(bookmarkedIds.includes(parseInt(id!)));
      } catch (error) {
        console.error('Failed to check bookmark status:', error);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!applicationMessage.trim()) {
      toast.error('Please provide a message with your application');
      return;
    }

    setApplying(true);
    try {
      await api.post(`/projects/${id}/applications`, {
        message: applicationMessage
      });
      toast.success('Application submitted successfully!');
      setShowApplicationModal(false);
      setApplicationMessage('');
      fetchProject(); // Refresh to update application status
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to submit application';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const handleStartChat = () => {
    navigate(`/chat/${project.owner.id}`);
  };

  const handleBookmark = async () => {
    setBookmarking(true);
    try {
      if (isBookmarked) {
        await api.delete(`/projects/${id}/bookmarks`);
        setIsBookmarked(false);
        toast.success('Bookmark removed');
      } else {
        await api.post(`/projects/${id}/bookmarks`);
        setIsBookmarked(true);
        toast.success('Project bookmarked');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update bookmark';
      toast.error(message);
    } finally {
      setBookmarking(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.put(`/projects/${id}`, { status, is_active: status !== 'inactive' });
      toast.success(`Project marked as ${status}`);
      fetchProject();
    } catch (error: any) {
      const message = error.response?.data?.error || `Failed to mark project as ${status}`;
      toast.error(message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <span className={`px-3 py-1 text-sm rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                {project.status}
              </span>
              <span className="text-sm text-gray-500">
                Created {formatDate(project.created_at)}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{project.name}</h1>
            <p className="text-lg text-gray-600 leading-relaxed">{project.description}</p>
          </div>

          <div className="mt-6 lg:mt-0 lg:ml-8 flex flex-col space-y-3">
            {!project.is_owner && !project.has_applied && (
              <button
                onClick={() => setShowApplicationModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Send size={20} />
                <span>Apply to Join</span>
              </button>
            )}

            {!project.is_owner && (
              <button
                onClick={handleBookmark}
                disabled={bookmarking}
                className={`px-6 py-3 rounded-lg transition-colors font-medium flex items-center space-x-2 ${isBookmarked
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {bookmarking ? (
                  <LoadingSpinner size="small" />
                ) : isBookmarked ? (
                  <BookmarkCheck size={20} />
                ) : (
                  <Bookmark size={20} />
                )}
                <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            )}

            {project.has_applied && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">Application Submitted</p>
                <p className="text-yellow-600 text-sm">Waiting for owner response</p>
              </div>
            )}

            {!project.is_owner && (
              <button
                onClick={handleStartChat}
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2"
              >
                <MessageCircle size={20} />
                <span>Message Owner</span>
              </button>
            )}

            {project.is_owner && (
              <div className="space-y-3">
                <Link
                  to={`/projects/${project.id}/applications`}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-center block"
                >
                  View Applications ({project.application_count})
                </Link>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('inactive')}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Mark Inactive
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project Links */}
        {(project.github_url || project.live_url) && (
          <div className="flex flex-wrap gap-4 mb-6">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Github size={20} />
                <span>View Code</span>
                <ExternalLink size={16} />
              </a>
            )}
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Globe size={20} />
                <span>Live Demo</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        )}

        {/* Skills */}
        {project.skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill: any) => (
                <span
                  key={skill.id}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{project.application_count}</div>
            <div className="text-sm text-gray-600">Applications</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{project.skills.length}</div>
            <div className="text-sm text-gray-600">Skills Required</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor((new Date().getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-gray-600">Days Active</div>
          </div>
        </div>
      </div>

      {/* Owner Information */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Project Owner</h2>
        <div className="flex items-start space-x-4">
          {project.owner.avatar_url ? (
            <img
              src={project.owner.avatar_url}
              alt={project.owner.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold text-xl">
                {project.owner.username[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{project.owner.full_name}</h3>
            <p className="text-gray-600">@{project.owner.username}</p>
            {project.owner.bio && (
              <p className="text-gray-600 mt-2">{project.owner.bio}</p>
            )}
            <div className="mt-4">
              <Link
                to={`/users/${project.owner.id}`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View Full Profile →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Apply to Join Project</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to join this project?
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell the project owner about your interest and relevant experience..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowApplicationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying || !applicationMessage.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? <LoadingSpinner size="small" /> : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}