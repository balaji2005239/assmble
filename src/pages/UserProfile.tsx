import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Mail, MapPin, Calendar, Github, ExternalLink, Linkedin, Twitter, Globe, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface UserData {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  bio?: string;
  location?: string;
  experience?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  portfolio_url?: string;
  avatar_url?: string;
  created_at: string;
  project_count: number;
  skills_count: number;
  skills: Array<{
    id: number;
    name: string;
    category: string;
  }>;
  roles: Array<{
    id: number;
    name: string;
    category: string;
  }>;
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      fetchUserPortfolio();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/auth/users/${id}`);
      setUser(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPortfolio = async () => {
    try {
      const response = await api.get(`/auth/users/${id}/portfolio`);
      setPortfolio(response.data);
    } catch (error) {
      console.error('Failed to fetch user portfolio:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600">{error || 'The user profile you\'re looking for doesn\'t exist.'}</p>
        </div>
      </div>
    );
  }

  const skillCategories = user.skills.reduce((acc: any, skill: any) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {});

  const roleCategories = user.roles.reduce((acc: any, role: any) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start space-x-6">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {user.full_name || user.username}
              </h1>
              <p className="text-gray-600 mb-2">@{user.username}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar size={16} />
                  <span>Joined {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                {user.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin size={16} />
                    <span>{user.location}</span>
                  </div>
                )}
                {user.experience && (
                  <div className="flex items-center space-x-1">
                    <span className="capitalize">{user.experience} level</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 lg:mt-0">
            <Link
              to={`/chat/${user.id}`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
            >
              <MessageCircle size={20} />
              <span>Send Message</span>
            </Link>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mt-6">
            <p className="text-gray-700 leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Social Links */}
        {(user.github_url || user.linkedin_url || user.twitter_url || user.portfolio_url) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Connect</h3>
            <div className="flex flex-wrap gap-3">
              {user.github_url && (
                <a
                  href={user.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Github size={16} />
                  <span>GitHub</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {user.linkedin_url && (
                <a
                  href={user.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Linkedin size={16} />
                  <span>LinkedIn</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {user.twitter_url && (
                <a
                  href={user.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Twitter size={16} />
                  <span>Twitter</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {user.portfolio_url && (
                <a
                  href={user.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Globe size={16} />
                  <span>Portfolio</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{user.project_count}</div>
            <div className="text-sm text-gray-600">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{user.skills_count}</div>
            <div className="text-sm text-gray-600">Skills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{portfolio.length}</div>
            <div className="text-sm text-gray-600">Portfolio Items</div>
          </div>
        </div>
      </div>

      {/* Skills & Roles */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Skills & Roles</h2>
        <div className="space-y-6">
          {((user.skills && user.skills.length > 0) || (user.roles && user.roles.length > 0)) ? (
            <>
              {user.skills && user.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Skills & Technologies</h3>
                  {Object.entries(skillCategories).map(([category, categorySkills]: [string, any]) => (
                    <div key={category} className="mb-3">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {categorySkills.map((skill: any) => (
                          <span
                            key={skill.id}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {user.roles && user.roles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Roles & Expertise</h3>
                  {Object.entries(roleCategories).map(([category, categoryRoles]: [string, any]) => (
                    <div key={category} className="mb-3">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {categoryRoles.map((role: any) => (
                          <span
                            key={role.id}
                            className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">No skills or roles added yet</p>
          )}
        </div>
      </div>

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((item: any) => (
              <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  {item.technologies && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.technologies.split(',').map((tech: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    {item.project_url && (
                      <a
                        href={item.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                      >
                        <Globe size={14} />
                        <span>Live</span>
                      </a>
                    )}
                    {item.github_url && (
                      <a
                        href={item.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 text-sm flex items-center space-x-1"
                      >
                        <Github size={14} />
                        <span>Code</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}