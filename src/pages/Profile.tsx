import React, { useState, useEffect } from 'react';
import { User, MapPin, Calendar, Mail, Edit3, Save, X, Plus, Github, Linkedin, Twitter, Globe, MessageCircle, Phone, Clock, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [roles, setRoles] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [activity, setActivity] = useState([]);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    description: '',
    image_url: '',
    project_url: '',
    github_url: '',
    technologies: ''
  });
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location: '',
    experience: '',
    github_url: '',
    linkedin_url: '',
    twitter_url: '',
    portfolio_url: '',
    preferred_contact: '',
    availability: '',
    open_to_opportunities: true,
    skill_ids: [] as number[],
    role_ids: [] as number[]
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        bio: user.bio || '',
        location: user.location || '',
        experience: user.experience || '',
        github_url: user.github_url || '',
        linkedin_url: user.linkedin_url || '',
        twitter_url: user.twitter_url || '',
        portfolio_url: user.portfolio_url || '',
        preferred_contact: user.preferred_contact || '',
        availability: user.availability || '',
        open_to_opportunities: user.open_to_opportunities ?? true,
        skill_ids: user.skills?.map(skill => skill.id) || [],
        role_ids: user.roles?.map(role => role.id) || []
      });
      fetchSkills();
      fetchRoles();
      fetchPortfolio();
      fetchActivity();
    }
  }, [user]);

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

  const fetchPortfolio = async () => {
    try {
      const response = await api.get('/auth/portfolio');
      setPortfolio(response.data);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  };

  const fetchActivity = async () => {
    try {
      const response = await api.get('/auth/activity');
      setActivity(response.data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/auth/me', formData);
      
      // Update user context
      updateUser({
        ...user!,
        ...formData,
        skills: skills.filter((skill: any) => formData.skill_ids.includes(skill.id)),
        roles: roles.filter((role: any) => formData.role_ids.includes(role.id))
      });
      
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      bio: user?.bio || '',
      location: user?.location || '',
      experience: user?.experience || '',
      github_url: user?.github_url || '',
      linkedin_url: user?.linkedin_url || '',
      twitter_url: user?.twitter_url || '',
      portfolio_url: user?.portfolio_url || '',
      preferred_contact: user?.preferred_contact || '',
      availability: user?.availability || '',
      open_to_opportunities: user?.open_to_opportunities ?? true,
      skill_ids: user?.skills?.map(skill => skill.id) || [],
      role_ids: user?.roles?.map(role => role.id) || []
    });
    setEditing(false);
  };

  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/portfolio', portfolioForm);
      toast.success('Portfolio item added successfully!');
      setShowPortfolioModal(false);
      setPortfolioForm({
        title: '',
        description: '',
        image_url: '',
        project_url: '',
        github_url: '',
        technologies: ''
      });
      fetchPortfolio();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add portfolio item';
      toast.error(message);
    }
  };

  const handleDeletePortfolioItem = async (itemId: number) => {
    try {
      await api.delete(`/auth/portfolio/${itemId}`);
      toast.success('Portfolio item deleted successfully!');
      fetchPortfolio();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete portfolio item';
      toast.error(message);
    }
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
      month: 'short',
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

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail size={16} />;
      case 'chat':
        return <MessageCircle size={16} />;
      case 'linkedin':
        return <Linkedin size={16} />;
      default:
        return <Phone size={16} />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

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
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {editing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                      placeholder="Your full name"
                    />
                  ) : (
                    user.full_name || user.username
                  )}
                </h1>
                {user.open_to_opportunities && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded-full">
                    Open to opportunities
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-2">@{user.username}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Mail size={16} />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar size={16} />
                  <span>Joined {formatDate(user.created_at)}</span>
                </div>
                {user.availability && (
                  <div className="flex items-center space-x-1">
                    <Clock size={16} />
                    <span className={`px-2 py-1 rounded-full text-xs ${getAvailabilityColor(user.availability)}`}>
                      {user.availability}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 lg:mt-0">
            {editing ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  {loading ? <LoadingSpinner size="small" /> : <Save size={16} />}
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Bio and Details */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            {editing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-gray-600">{user.bio || 'No bio provided'}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              {editing ? (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your location"
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin size={16} />
                  <span>{user.location || 'Not specified'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
              {editing ? (
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select experience level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              ) : (
                <p className="text-gray-600 capitalize">{user.experience || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Social Links */}
          {editing && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GitHub URL</label>
                  <input
                    type="url"
                    name="github_url"
                    value={formData.github_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://github.com/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Twitter URL</label>
                  <input
                    type="url"
                    name="twitter_url"
                    value={formData.twitter_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://twitter.com/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio URL</label>
                  <input
                    type="url"
                    name="portfolio_url"
                    value={formData.portfolio_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Preferences */}
          {editing && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact</label>
                  <select
                    name="preferred_contact"
                    value={formData.preferred_contact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select method</option>
                    <option value="email">Email</option>
                    <option value="chat">Chat</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                  <select
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select availability</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      name="open_to_opportunities"
                      checked={formData.open_to_opportunities}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Open to new opportunities</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Social Links Display */}
        {!editing && (user.github_url || user.linkedin_url || user.twitter_url || user.portfolio_url) && (
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

        {/* Contact Preferences Display */}
        {!editing && (user.preferred_contact || user.availability) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Preferences</h3>
            <div className="flex flex-wrap gap-3">
              {user.preferred_contact && (
                <div className="flex items-center space-x-2 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg">
                  {getContactIcon(user.preferred_contact)}
                  <span className="capitalize">{user.preferred_contact}</span>
                </div>
              )}
              {user.availability && (
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getAvailabilityColor(user.availability)}`}>
                  <Clock size={16} />
                  <span className="capitalize">{user.availability}</span>
                </div>
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
        {editing ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Skills & Technologies</h3>
              {Object.entries(skillCategories).map(([category, categorySkills]: [string, any]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categorySkills.map((skill: any) => (
                      <label key={skill.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.skill_ids.includes(skill.id)}
                          onChange={() => handleSkillToggle(skill.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{skill.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Roles & Expertise</h3>
              {Object.entries(roleCategories).map(([category, categoryRoles]: [string, any]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryRoles.map((role: any) => (
                      <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.role_ids.includes(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {((user.skills && user.skills.length > 0) || (user.roles && user.roles.length > 0)) ? (
              <>
                {user.skills && user.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Skills & Technologies</h3>
                    {Object.entries(
                      user.skills.reduce((acc: any, skill: any) => {
                        if (!acc[skill.category]) {
                          acc[skill.category] = [];
                        }
                        acc[skill.category].push(skill);
                        return acc;
                      }, {})
                    ).map(([category, categorySkills]: [string, any]) => (
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
                    {Object.entries(
                      user.roles.reduce((acc: any, role: any) => {
                        if (!acc[role.category]) {
                          acc[role.category] = [];
                        }
                        acc[role.category].push(role);
                        return acc;
                      }, {})
                    ).map(([category, categoryRoles]: [string, any]) => (
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
        )}
      </div>

      {/* Portfolio Section */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Portfolio</h2>
          <button
            onClick={() => setShowPortfolioModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Project</span>
          </button>
        </div>

        {portfolio.length > 0 ? (
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
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <button
                      onClick={() => handleDeletePortfolioItem(item.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Globe size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No portfolio items yet. Add your first project!</p>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        {activity.length > 0 ? (
          <div className="space-y-4">
            {activity.map((item: any) => (
              <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-900">{item.action_description}</p>
                  <p className="text-sm text-gray-500">{formatDateTime(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
      </div>

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Portfolio Item</h3>
            <form onSubmit={handlePortfolioSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={portfolioForm.title}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={portfolioForm.image_url}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project URL</label>
                <input
                  type="url"
                  value={portfolioForm.project_url}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, project_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourproject.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GitHub URL</label>
                <input
                  type="url"
                  value={portfolioForm.github_url}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, github_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/username/repo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Technologies</label>
                <input
                  type="text"
                  value={portfolioForm.technologies}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, technologies: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="React, Node.js, MongoDB (comma separated)"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPortfolioModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}