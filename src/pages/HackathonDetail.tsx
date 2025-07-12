import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, Trophy, Send, MessageCircle, Star, Clock, MapPin, Tag } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function HackathonDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    fetchHackathon();
  }, [id]);

  const fetchHackathon = async () => {
    try {
      const response = await api.get(`/hackathons/${id}`);
      setHackathon(response.data);
    } catch (error) {
      console.error('Failed to fetch hackathon:', error);
      toast.error('Failed to load team search');
      navigate('/hackathons');
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
      await api.post(`/hackathons/${id}/applications`, {
        message: applicationMessage
      });
      toast.success('Application submitted successfully!');
      setShowApplicationModal(false);
      setApplicationMessage('');
      fetchHackathon(); // Refresh to update application status
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to submit application';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const handleStartChat = () => {
    navigate(`/chat/${hackathon.owner.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Team search not found</h2>
        <Link to="/hackathons" className="text-purple-600 hover:text-purple-700">
          Back to Team Search
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
              <span className={`px-3 py-1 text-sm rounded-full ${
                hackathon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {hackathon.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-500">
                Created {formatDate(hackathon.created_at)}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{hackathon.title}</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">{hackathon.description}</p>
            
            <div className="space-y-3">
              <div className="flex items-center text-purple-600">
                <Trophy size={20} className="mr-2" />
                <span className="font-medium text-lg">{hackathon.hackathon_name}</span>
              </div>
              
              {hackathon.hackathon_date && (
                <div className="flex items-center text-gray-600">
                  <Calendar size={20} className="mr-2" />
                  <span>{formatDateTime(hackathon.hackathon_date)}</span>
                </div>
              )}
              
              {hackathon.max_team_size && (
                <div className="flex items-center text-gray-600">
                  <Users size={20} className="mr-2" />
                  <span>{hackathon.current_member_count}/{hackathon.max_team_size} team members</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 lg:mt-0 lg:ml-8 flex flex-col space-y-3">
            {!hackathon.is_owner && !hackathon.has_applied && hackathon.is_active && (
              <button
                onClick={() => setShowApplicationModal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Send size={20} />
                <span>Apply to Join</span>
              </button>
            )}
            
            {hackathon.has_applied && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">Application Submitted</p>
                <p className="text-yellow-600 text-sm">Waiting for team organizer response</p>
              </div>
            )}
            
            {!hackathon.is_owner && (
              <button
                onClick={handleStartChat}
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2"
              >
                <MessageCircle size={20} />
                <span>Message Organizer</span>
              </button>
            )}
            
            {hackathon.is_owner && (
              <Link
                to={`/hackathons/${hackathon.id}/applications`}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
              >
                View Applications ({hackathon.application_count})
              </Link>
            )}
          </div>
        </div>

        {/* Skills */}
        {hackathon.skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {hackathon.skills.map((skill: any) => (
                <span
                  key={skill.id}
                  className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Roles */}
        {hackathon.roles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Looking for Roles</h3>
            <div className="flex flex-wrap gap-2">
              {hackathon.roles.map((role: any) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{hackathon.application_count}</div>
            <div className="text-sm text-gray-600">Applications</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{hackathon.skills.length}</div>
            <div className="text-sm text-gray-600">Skills Required</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor((new Date().getTime() - new Date(hackathon.created_at).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-gray-600">Days Active</div>
          </div>
        </div>
      </div>

      {/* Organizer Information */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Team Organizer</h2>
        <div className="flex items-start space-x-4">
          {hackathon.owner.avatar_url ? (
            <img
              src={hackathon.owner.avatar_url}
              alt={hackathon.owner.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold text-xl">
                {hackathon.owner.username[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{hackathon.owner.full_name}</h3>
            <p className="text-gray-600">@{hackathon.owner.username}</p>
            {hackathon.owner.bio && (
              <p className="text-gray-600 mt-2">{hackathon.owner.bio}</p>
            )}
            <div className="mt-4">
              <Link
                to={`/users/${hackathon.owner.id}`}
                className="text-purple-600 hover:text-purple-700 font-medium"
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Apply to Join Team</h3>
            <p className="text-gray-600 mb-4">
              Applying for: <strong>{hackathon.hackathon_name}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to join this team?
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Tell the team organizer about your skills and why you'd be a great addition..."
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
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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