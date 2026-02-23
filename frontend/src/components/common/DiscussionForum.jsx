import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSend, FiMessageCircle, FiTrash2, FiStar, FiThumbsUp, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './DiscussionForum.css';

const DiscussionForum = ({ eventId, eventName }) => {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, text, userName }
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/discussions/${eventId}/messages`);
      if (response.data.success) {
        setMessages(response.data.data.messages);
      }
    } catch {
      // Silently fail on poll errors
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds for new messages
    pollInterval.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollInterval.current);
  }, [fetchMessages]);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const payload = { message: newMessage.trim() };
      if (replyingTo) {
        payload.parentId = replyingTo.id;
      }

      const response = await api.post(`/discussions/${eventId}/messages`, payload);
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.data.message]);
        setNewMessage('');
        setReplyingTo(null);
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await api.delete(`/discussions/${eventId}/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handlePin = async (messageId) => {
    try {
      const response = await api.patch(`/discussions/${eventId}/messages/${messageId}/pin`);
      if (response.data.success) {
        setMessages(prev => prev.map(m => m._id === messageId ? response.data.data.message : m));
      }
    } catch {
      toast.error('Failed to pin message');
    }
  };

  const handleReact = async (messageId) => {
    try {
      const response = await api.post(`/discussions/${eventId}/messages/${messageId}/react`, { emoji: '👍' });
      if (response.data.success) {
        setMessages(prev => prev.map(m => m._id === messageId ? response.data.data.message : m));
      }
    } catch {
      toast.error('Log in to react');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  let lastDate = '';

  return (
    <div className="discussion-forum">
      <div className="forum-header">
        <FiMessageCircle />
        <h3>Discussion — {eventName}</h3>
        <span className="message-count">{messages.length} messages</span>
      </div>

      <div className="messages-container">
        {loading ? (
          <div className="forum-loading">
            <div className="spinner"></div>
            <p>Loading discussion...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <FiMessageCircle />
            <p>No messages yet. Start the discussion!</p>
          </div>
        ) : (
          [...messages].sort((a, b) => {
            if (a.isPinned === b.isPinned) return new Date(a.createdAt) - new Date(b.createdAt);
            return a.isPinned ? -1 : 1;
          }).map(msg => {
            const msgDate = formatDate(msg.createdAt);
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;
            const isOwn = user && msg.userId === user._id;
            const isEventOrganizer = user && user.role === 'organizer'; // Simplified check

            return (
              <div key={msg._id}>
                {showDate && (
                  <div className="date-separator">
                    <span>{msgDate}</span>
                  </div>
                )}
                <div className={`message ${isOwn ? 'own' : ''} ${msg.userRole === 'organizer' ? 'organizer-msg' : ''} ${msg.isPinned ? 'pinned-msg' : ''}`} style={msg.isPinned ? { border: '1px solid var(--gold)', backgroundColor: 'rgba(255, 215, 0, 0.05)' } : {}}>
                  <div className="message-header">
                    <span className="author-name">
                      {msg.userName}
                      {msg.userRole === 'organizer' && <span className="org-badge">Organizer</span>}
                      {msg.isPinned && <span className="pin-badge" style={{ marginLeft: '5px', color: 'var(--gold)' }}><FiStar /> Pinned</span>}
                    </span>
                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                  </div>
                  {msg.parentId && (
                    <div className="reply-reference" style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', borderLeft: '2px solid var(--accent)' }}>
                       Replying to {messages.find(m => m._id === msg.parentId)?.userName || 'a message'}: <span style={{opacity: 0.7}}>{messages.find(m => m._id === msg.parentId)?.message?.substring(0, 30)}...</span>
                    </div>
                  )}
                  <p className="message-text">{msg.message}</p>
                  
                  <div className="message-actions" style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.85rem' }}>
                    <button 
                      className="react-btn" 
                      onClick={() => handleReact(msg._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiThumbsUp /> {msg.reactions?.length || 0}
                    </button>
                    
                    <button 
                      className="reply-btn" 
                      onClick={() => setReplyingTo({ id: msg._id, text: msg.message, userName: msg.userName })}
                      style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
                    >
                      Reply
                    </button>
                    
                    {isEventOrganizer && (
                      <button 
                        className="pin-btn" 
                        onClick={() => handlePin(msg._id)}
                        style={{ background: 'none', border: 'none', color: msg.isPinned ? 'var(--gold)' : 'var(--text-light)', cursor: 'pointer' }}
                      >
                        <FiStar /> {msg.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}

                    {(isOwn || isEventOrganizer) && (
                      <button 
                        className="delete-msg-btn" 
                        onClick={() => handleDelete(msg._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', marginLeft: 'auto' }}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {isAuthenticated ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {replyingTo && (
            <div className="replying-to-banner" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '0.85rem', borderTop: '1px solid var(--border)' }}>
              <span>Replying to {replyingTo.userName}: <span style={{ opacity: 0.7 }}>{replyingTo.text.length > 30 ? replyingTo.text.substring(0, 30) + '...' : replyingTo.text}</span></span>
              <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><FiX /></button>
            </div>
          )}
          <form className="message-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              maxLength={1000}
            />
            <button type="submit" disabled={sending || !newMessage.trim()}>
              <FiSend />
            </button>
          </form>
        </div>
      ) : (
        <div className="login-prompt">
          <p>Log in to join the discussion</p>
        </div>
      )}
    </div>
  );
};

export default DiscussionForum;
