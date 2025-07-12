import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Calendar, Users, ExternalLink, Github, Globe, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Bookmarks() {
  const [bookmarkedProjects, setBookmarkedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarkedProjects();
  }, []);

  const fetchBookmarkedProjects = async () => {
    try {
      const response = await api.get('/projects/bookmarks');
      setBookmarkedProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch bookmarked projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (projectId: number) => {
    try {
      await api.delete(`/projects/${projectId}/bookmarks`);
      setBookmarkedProjects(prev => prev.filter((project: any) => project.id !== projectId));
      toast.success('Bookmark removed');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to remove bookmark';
      toast.error(message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bookmarked Projects</h1>
        <p className="text-gray-600 mt-1">Projects you've saved for later</p>
      </div>

      {/* Projects Grid */}
      {bookmarkedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedProjects.map((project: any) => (
            <div key={project.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {project.owner.avatar_url ? (
                    <img
                      src={project.owner.avatar_url}
                      alt={project.owner.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {project.owner.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.owner.username}</h3>
                    <p className="text-sm text-gray-600">{project.owner.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Bookmark className="text-blue-600" size={16} />
                  <button
                    onClick={() => removeBookmark(project.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h2>
              <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>

              {project.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.skills.slice(0, 3).map((skill: any) => (
                    <span
                      key={skill.id}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {skill.name}
                    </span>
                  ))}
                  {project.skills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{project.skills.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Users size={16} />
                    <span>{project.application_count} applications</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={16} />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Github size={16} />
                    </a>
                  )}
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Globe size={16} />
                    </a>
                  )}
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bookmark size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookmarked projects</h3>
          <p className="text-gray-600 mb-4">
            Start bookmarking projects you're interested in to see them here.
          </p>
          <Link
            to="/projects"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Projects
          </Link>
        </div>
      )}
    </div>
  );
}