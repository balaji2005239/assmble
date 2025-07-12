import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, Users, Calendar, MessageCircle, Bell, TrendingUp, Star, GitBranch, Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    myProjects: 0,
    myApplications: 0,
    notifications: 0,
    messages: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [bookmarkedProjects, setBookmarkedProjects] = useState([]);
  const [suggestedProjects, setSuggestedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [projectsRes, applicationsRes, notificationsRes, messagesRes, bookmarksRes, suggestionsRes] = await Promise.all([
        api.get('/projects/my'),
        api.get('/projects/applications/my'),
        api.get('/notifications/count'),
        api.get('/chat/unread-count'),
        api.get('/projects/bookmarks'),
        api.get('/projects/suggestions?limit=3')
      ]);

      setStats({
        myProjects: projectsRes.data.length,
        myApplications: applicationsRes.data.length,
        notifications: notificationsRes.data.unread,
        messages: messagesRes.data.unread_count
      });

      setRecentProjects(projectsRes.data.slice(0, 3));
      setRecentApplications(applicationsRes.data.slice(0, 3));
      setBookmarkedProjects(bookmarksRes.data.slice(0, 3));
      setSuggestedProjects(suggestionsRes.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Project',
      description: 'Start a new project and find collaborators',
      icon: Plus,
      link: '/projects/create',
      color: 'bg-blue-500'
    },
    {
      title: 'Browse Projects',
      description: 'Find interesting projects to contribute to',
      icon: Briefcase,
      link: '/projects',
      color: 'bg-green-500'
    },
    {
      title: 'Join Hackathon',
      description: 'Participate in exciting hackathons',
      icon: Calendar,
      link: '/hackathons',
      color: 'bg-purple-500'
    },
    {
      title: 'Start Chat',
      description: 'Connect with other developers',
      icon: MessageCircle,
      link: '/chat',
      color: 'bg-orange-500'
    }
  ];

  const statCards = [
    {
      title: 'My Projects',
      value: stats.myProjects,
      icon: Briefcase,
      color: 'bg-blue-50 text-blue-600',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Applications',
      value: stats.myApplications,
      icon: Users,
      color: 'bg-green-50 text-green-600',
      iconColor: 'text-green-600'
    },
    {
      title: 'Notifications',
      value: stats.notifications,
      icon: Bell,
      color: 'bg-yellow-50 text-yellow-600',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Messages',
      value: stats.messages,
      icon: MessageCircle,
      color: 'bg-purple-50 text-purple-600',
      iconColor: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="text-blue-100 text-lg">
          Ready to collaborate on some amazing projects today?
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} className={stat.iconColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {recentProjects.length > 0 ? (
              recentProjects.map((project: any) => (
                <div key={project.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Users size={14} className="mr-1" />
                    {project.application_count} applications
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No projects yet. Create your first project!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
            <Link to="/applications" className="text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {recentApplications.length > 0 ? (
              recentApplications.map((application: any) => (
                <div key={application.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{application.project.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {application.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{application.project.description}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No applications yet. Browse projects to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Bookmarked Projects Widget */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Bookmarked</h2>
            <Link to="/bookmarks" className="text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {bookmarkedProjects.length > 0 ? (
              bookmarkedProjects.map((project: any) => (
                <div key={project.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <Bookmark size={16} className="text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Users size={14} className="mr-1" />
                    {project.application_count} applications
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bookmark size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No bookmarked projects yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Projects */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Suggested for You</h2>
          <Link to="/projects" className="text-blue-600 hover:text-blue-700 font-medium">
            Browse All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestedProjects.length > 0 ? (
            suggestedProjects.map((project: any) => (
              <div key={project.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {project.match_score}% match
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.skills.slice(0, 2).map((skill: any) => (
                    <span key={skill.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {skill.name}
                    </span>
                  ))}
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Details →
                </Link>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No suggestions available. Complete your profile to get personalized recommendations!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}