import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Search, User, MessageCircle, ArrowLeft } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Chat() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchConversations();
    if (userId) {
      selectUserById(parseInt(userId));
    }
  }, [userId]);

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Listen for new messages
    newSocket.on('new_message', (messageData: any) => {
      messageData.is_own = messageData.sender_id === parseInt(user?.id || '0');
      setMessages(prev => [...prev, messageData]);

      // Update navbar count
      window.dispatchEvent(new CustomEvent('messageRead'));
    });

    // Listen for typing indicators
    newSocket.on('user_typing', (data: any) => {
      if (data.user_id !== parseInt(user?.id || '0')) {
        setOtherUserTyping(data.is_typing);

        if (data.is_typing) {
          // Clear typing indicator after 3 seconds
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (socket && selectedUser && user) {
      // Join chat room
      socket.emit('join_chat', {
        user_id: parseInt(user.id.toString()),
        other_user_id: selectedUser.id
      });

      return () => {
        // Leave chat room
        socket.emit('leave_chat', {
          user_id: parseInt(user.id.toString()),
          other_user_id: selectedUser.id
        });
      };
    }
  }, [socket, selectedUser, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectUserById = async (id: number) => {
    try {
      // Find user in conversations first
      const conversation = conversations.find((conv: any) => conv.user.id === id);
      if (conversation) {
        setSelectedUser(conversation.user);
      } else {
        // If not in conversations, fetch user profile
        const response = await api.get(`/auth/users/${id}`);
        setSelectedUser(response.data);
      }
      fetchMessages(id);
    } catch (error) {
      console.error('Failed to select user:', error);
    }
  };

  const selectUser = (user: any) => {
    setSelectedUser(user);
    fetchMessages(user.id);
  };

  const fetchMessages = async (userId: number) => {
    try {
      const response = await api.get(`/chat/messages/${userId}`);
      setMessages(response.data.messages);

      // Update navbar count
      window.dispatchEvent(new CustomEvent('messageRead'));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      if (socket) {
        // Send via WebSocket for real-time delivery
        socket.emit('send_message', {
          sender_id: parseInt(user?.id || '0'),
          receiver_id: selectedUser.id,
          content: messageContent
        });
      } else {
        // Fallback to HTTP API
        const response = await api.post('/chat/messages', {
          receiver_id: selectedUser.id,
          content: messageContent
        });
        setMessages(prev => [...prev, response.data]);
      }

      // Update conversations list
      fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (socket && selectedUser && user) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing', {
          user_id: parseInt(user.id.toString()),
          other_user_id: selectedUser.id,
          is_typing: true
        });
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing', {
          user_id: parseInt(user.id.toString()),
          other_user_id: selectedUser.id,
          is_typing: false
        });
      }, 1000);
    }
  };

  const searchUsers = async () => {
    try {
      const response = await api.get(`/chat/users/search?q=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: '600px' }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="p-3 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {searchResults.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        selectUser(user);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="w-full p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={16} className="text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map((conversation: any) => (
                  <button
                    key={conversation.user.id}
                    onClick={() => selectUser(conversation.user)}
                    className={`w-full p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 ${selectedUser?.id === conversation.user.id ? 'bg-blue-50' : ''
                      }`}
                  >
                    <div className="flex items-start space-x-3">
                      {conversation.user.avatar_url ? (
                        <img
                          src={conversation.user.avatar_url}
                          alt={conversation.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.user.full_name || conversation.user.username}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(conversation.last_message.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.last_message.content}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="inline-block mt-1 bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Search for users to start chatting</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {selectedUser.avatar_url ? (
                      <img
                        src={selectedUser.avatar_url}
                        alt={selectedUser.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedUser.full_name || selectedUser.username}
                      </h3>
                      <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                    </div>
                    <div className="ml-auto">
                      <Link
                        to={`/users/${selectedUser.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_own ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.is_own
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                          }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${message.is_own ? 'text-blue-100' : 'text-gray-500'
                            }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div className="px-4 py-2 text-sm text-gray-500 italic">
                    {selectedUser.full_name || selectedUser.username} is typing...
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <LoadingSpinner size="small" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the sidebar or search for users to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}