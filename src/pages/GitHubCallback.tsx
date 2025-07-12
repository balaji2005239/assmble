import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function GitHubCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();

  useEffect(() => {
    handleGitHubCallback();
  }, []);

  const handleGitHubCallback = async () => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('GitHub authentication was cancelled');
      navigate('/login');
      return;
    }

    if (!code) {
      toast.error('No authorization code received from GitHub');
      navigate('/login');
      return;
    }

    try {
      const response = await api.post('/oauth/github/callback', { code });
      const { access_token, refresh_token, user } = response.data;

      // Store tokens
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      // Update user context
      updateUser(user);

      toast.success('GitHub authentication successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('GitHub callback error:', error);
      const message = error.response?.data?.error || 'GitHub authentication failed';
      toast.error(message);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="large" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Completing GitHub Authentication...
        </h2>
        <p className="mt-2 text-gray-600">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
}