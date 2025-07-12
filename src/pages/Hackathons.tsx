import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, Plus, Clock, Tag, Send, MapPin } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast'

export default function Hackathons() {
  const [hackathons, setHackathons] = useState([]);
  const [skills, setSkills] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState<any>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hackathon_name: '',
    hackathon_date: '',
    max_team_size: '',
    skill_ids: [] as number[],
    role_ids: [] as number[]
  });

  useEffect(() => {
    fetchHackathons();
    fetchSkills();
    fetchRoles();
  }, []);

  const fetchHackathons = async () => {
    try {
      const response = await api.get('/hackathons');
      setHackathons(response.data.hackathons);
    } catch (error) {
      console.error('Failed to fetch hackathons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await api.get('/auth/skills');
      setSkills(response.data);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/auth/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleCreateHackathon = async () => {
    if (!formData.title.trim() || !formData.hackathon_name.trim()) {
      toast.error('Title and hackathon name are required');
      return;
    }

    setCreating(true);
    try {
      await api.post('/hackathons', formData);
      toast.success('Team search created successfully! Pending approval.');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        hackathon_name: '',
        hackathon_date: '',
        max_team_size: '',
        skill_ids: [],
        role_ids: []
      });
      fetchHackathons();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create team search';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleApplyToHackathon = async () => {
    if (!applicationMessage.trim()) {
      toast.error('Please provide a message with your application');
      return;
    }

    setApplying(true);
    try {
      await api.post(`/hackathons/${selectedHackathon.id}/applications`, {
        message: applicationMessage
      });
      toast.success('Application submitted successfully!');
      setShowApplicationModal(false);
      setApplicationMessage('');
      setSelectedHackathon(null);
      fetchHackathons();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to submit application';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const handleSkillToggle = (skillId: number) => {
    setFormData(prev => ({
      ...prev,
      skill_ids: prev.skill_ids.includes(skillId)
        ? prev.skill_ids.filter(id => id !== skillId)
        : [...prev.skill_ids, skillId]
    }));
  };

  const handleRoleToggle = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }));
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

  const skillCategories = skills.reduce((acc: any, skill: any) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {});

  const roleCategories = roles.reduce((acc: any, role: any) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {});

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Find Teammates</h1>
          <p className="text-gray-600 mt-1">Connect with developers for hackathons and competitions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Find Teammates</span>
        </button>
      </div>

      {/* Hackathons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hackathons.map((hackathon: any) => (
          <div key={hackathon.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {hackathon.owner.avatar_url ? (
                  <img
                    src={hackathon.owner.avatar_url}
                    alt={hackathon.owner.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {hackathon.owner.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{hackathon.owner.username}</h3>
                  <p className="text-sm text-gray-600">{hackathon.owner.full_name}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${'bg-green-100 text-green-800'}`}>
                Active
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">{hackathon.title}</h2>
            <p className="text-gray-600 mb-4 line-clamp-3">{hackathon.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Trophy size={16} className="mr-2 text-purple-500" />
                <span className="font-medium">{hackathon.hackathon_name}</span>
              </div>
              {hackathon.hackathon_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar size={16} className="mr-2 text-blue-500" />
                  <span>{formatDateTime(hackathon.hackathon_date)}</span>
                </div>
              )}
              {hackathon.max_team_size && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users size={16} className="mr-2 text-green-500" />
                  <span>{hackathon.current_member_count}/{hackathon.max_team_size} members</span>
                </div>
              )}
            </div>

            {hackathon.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {hackathon.skills.slice(0, 3).map((skill: any) => (
                  <span
                    key={skill.id}
                    className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                  >
                    {skill.name}
                  </span>
                ))}
                {hackathon.skills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{hackathon.skills.length - 3} more
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <Users size={16} />
                <span>{hackathon.application_count} applications</span>
              </div>
              <span>Posted {formatDate(hackathon.created_at)}</span>
            </div>

            <div className="flex space-x-2">
              <Link
                to={`/hackathons/${hackathon.id}`}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium text-center"
              >
                View Details
              </Link>
              {!hackathon.has_applied && !hackathon.is_owner && (
                <button
                  onClick={() => {
                    setSelectedHackathon(hackathon);
                    setShowApplicationModal(true);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Apply to Join
                </button>
              )}
              {hackathon.has_applied && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                  <span className="text-yellow-800 text-sm font-medium">Applied</span>
                </div>
              )}
              {hackathon.is_owner && (
                <Link
                  to={`/hackathons/${hackathon.id}/applications`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium text-center"
                >
                  View Applications ({hackathon.application_count})
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {hackathons.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Trophy size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No team searches found</h3>
          <p className="text-gray-600 mb-4">
            Be the first to create a team search for an upcoming hackathon!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Find Teammates</span>
          </button>
        </div>
      )}

      {/* Create Team Search Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Find Teammates for Hackathon</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What are you looking for? *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Looking for frontend developer for HackMIT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hackathon Name *</label>
                <input
                  type="text"
                  value={formData.hackathon_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, hackathon_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., HackMIT 2024, Global Game Jam, Smart India Hackathon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe what kind of teammates you're looking for and your project idea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hackathon Date</label>
                  <input
                    type="datetime-local"
                    value={formData.hackathon_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, hackathon_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Team Size</label>
                  <input
                    type="number"
                    value={formData.max_team_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_team_size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 4"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                <div className="space-y-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {Object.entries(skillCategories).map(([category, categorySkills]: [string, any]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-800 mb-2">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {categorySkills.map((skill: any) => (
                          <label key={skill.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.skill_ids.includes(skill.id)}
                              onChange={() => handleSkillToggle(skill.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">{skill.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Looking for Roles</label>
                <div className="space-y-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {Object.entries(roleCategories).map(([category, categoryRoles]: [string, any]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-800 mb-2">{category}</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {categoryRoles.map((role: any) => (
                          <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.role_ids.includes(role.id)}
                              onChange={() => handleRoleToggle(role.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">{role.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHackathon}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? <LoadingSpinner size="small" /> : 'Create Team Search'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedHackathon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Apply to Join Team</h3>
            <p className="text-gray-600 mb-4">
              Applying for: <strong>{selectedHackathon.hackathon_name}</strong>
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
                onClick={() => {
                  setShowApplicationModal(false);
                  setSelectedHackathon(null);
                  setApplicationMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyToHackathon}
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