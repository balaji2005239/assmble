import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetail from './pages/ProjectDetail';
import ProjectApplications from './pages/ProjectApplications';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Chat from './pages/Chat';
import Hackathons from './pages/Hackathons';
import HackathonApplications from './pages/HackathonApplications';
import HackathonDetail from './pages/HackathonDetail';
import Notifications from './pages/Notifications';
import Applications from './pages/Applications';
import Bookmarks from './pages/Bookmarks';
import AdminPanel from './pages/AdminPanel';
import LoadingSpinner from './components/LoadingSpinner';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Home />
            </main>
          </>
        } />
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" /> : 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Login />
            </main>
          </>
        } />
        <Route path="/register" element={
          user ? <Navigate to="/dashboard" /> : 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Register />
            </main>
          </>
        } />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Dashboard />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/projects" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Projects />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/projects/create" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <CreateProject />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/projects/:id" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <ProjectDetail />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/projects/:id/applications" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <ProjectApplications />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/applications" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Applications />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/bookmarks" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Bookmarks />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/profile" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Profile />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/users/:id" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <UserProfile />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/chat" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Chat />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/chat/:userId" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Chat />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/hackathons" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Hackathons />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/hackathons/:id" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <HackathonDetail />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/hackathons/:id/applications" element={
          user ? 
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <HackathonApplications />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/notifications" element={
          user ?
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Notifications />
            </main>
          </> : <Navigate to="/login" />
        } />
        <Route path="/admin" element={
          user ? <AdminPanel /> : <Navigate to="/login" />
        } />
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;