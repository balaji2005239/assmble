import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, MessageCircle, Star, Code, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: Briefcase,
      title: 'Find Projects',
      description: 'Discover exciting projects that match your skills and interests',
      color: 'bg-blue-500'
    },
    {
      icon: Users,
      title: 'Connect with Developers',
      description: 'Network with talented developers from around the world',
      color: 'bg-purple-500'
    },
    {
      icon: MessageCircle,
      title: 'Real-time Chat',
      description: 'Communicate seamlessly with your project collaborators',
      color: 'bg-green-500'
    },
    {
      icon: Trophy,
      title: 'Find Teammates',
      description: 'Join exciting hackathons and compete with other developers',
      color: 'bg-yellow-500'
    },
    {
      icon: Code,
      title: 'Skills Matching',
      description: 'Get matched with projects based on your technical skills',
      color: 'bg-red-500'
    },
    {
      icon: Star,
      title: 'Build Portfolio',
      description: 'Showcase your work and build an impressive developer portfolio',
      color: 'bg-indigo-500'
    }
  ];

  const stats = [
    { number: '1,000+', label: 'Active Projects' },
    { number: '5,000+', label: 'Developers' },
    { number: '500+', label: 'Completed Projects' },
    { number: '100+', label: 'Teams Formed' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Assemble Your 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {' '}Dream Team
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              The ultimate platform for developers to collaborate on projects, 
              find teammates for hackathons, and build amazing things together.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center space-x-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight size={20} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center space-x-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={20} />
                  </Link>
                  <Link
                    to="/login"
                    className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools and features designed to help developers collaborate 
              effectively and build amazing projects together.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Building?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of developers who are already collaborating 
              and building amazing projects on Assemble.
            </p>
            {!user && (
              <Link
                to="/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg inline-flex items-center space-x-2"
              >
                <span>Join Assemble</span>
                <ArrowRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}