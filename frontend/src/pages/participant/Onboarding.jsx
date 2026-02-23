import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { participantService } from '../../services';
import { FiCheck, FiArrowRight, FiSkipForward, FiStar, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Onboarding.css';

const INTEREST_OPTIONS = [
  { id: 'technical', label: 'Technical', icon: '💻', desc: 'Coding, hackathons, tech talks' },
  { id: 'cultural', label: 'Cultural', icon: '🎭', desc: 'Dance, music, drama, art' },
  { id: 'sports', label: 'Sports', icon: '⚽', desc: 'Cricket, football, athletics' },
  { id: 'literary', label: 'Literary', icon: '📚', desc: 'Debates, quizzes, writing' },
  { id: 'social', label: 'Social', icon: '🤝', desc: 'Community service, networking' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', desc: 'Esports, game dev, board games' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', icon: '🚀', desc: 'Startups, business, innovation' },
  { id: 'design', label: 'Design', icon: '🎨', desc: 'UI/UX, graphic design, photography' }
];

const Onboarding = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        const response = await participantService.getOrganizers();
        setOrganizers(response.data?.organizers || []);
      } catch (err) {
        console.error('Failed to fetch organizers', err);
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchOrganizers();
  }, []);

  const toggleInterest = (id) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleFollow = (orgId) => {
    setFollowedOrganizers(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await participantService.completeOnboarding({
        interests: selectedInterests,
        followedOrganizers
      });
      updateUser({ ...user, onboardingCompleted: true, interests: selectedInterests });
      toast.success('Preferences saved! Welcome to Felicity');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await participantService.completeOnboarding({
        interests: [],
        followedOrganizers: []
      });
      updateUser({ ...user, onboardingCompleted: true });
      toast.success('You can set preferences later from your Profile');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to skip onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1>Welcome to <span className="highlight">Felicity</span></h1>
          <p>Let us personalize your experience. This takes less than a minute!</p>
          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h2><FiStar /> What are you interested in?</h2>
            <p className="step-desc">Select all that apply — this helps us recommend events for you.</p>
            <div className="interests-grid">
              {INTEREST_OPTIONS.map(interest => (
                <div
                  key={interest.id}
                  className={`interest-card ${selectedInterests.includes(interest.id) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  <span className="interest-icon">{interest.icon}</span>
                  <span className="interest-label">{interest.label}</span>
                  <span className="interest-desc">{interest.desc}</span>
                  {selectedInterests.includes(interest.id) && (
                    <span className="check-badge"><FiCheck /></span>
                  )}
                </div>
              ))}
            </div>
            <div className="step-actions">
              <button className="skip-btn" onClick={() => setStep(2)}>
                Skip <FiSkipForward />
              </button>
              <button className="next-btn" onClick={() => setStep(2)}>
                Next <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2><FiUsers /> Follow Clubs & Organizers</h2>
            <p className="step-desc">Follow clubs to see their events first in your feed.</p>
            {loadingOrgs ? (
              <div className="loading-state">Loading clubs...</div>
            ) : organizers.length === 0 ? (
              <div className="empty-state">No clubs available yet. You can follow them later!</div>
            ) : (
              <div className="organizers-grid">
                {organizers.map(org => (
                  <div
                    key={org._id}
                    className={`organizer-card ${followedOrganizers.includes(org._id) ? 'followed' : ''}`}
                    onClick={() => toggleFollow(org._id)}
                  >
                    <div className="org-avatar">{org.name?.charAt(0)}</div>
                    <div className="org-info">
                      <h3>{org.name}</h3>
                      <span className="org-category">{org.category}</span>
                    </div>
                    <button className={`follow-btn ${followedOrganizers.includes(org._id) ? 'following' : ''}`}>
                      {followedOrganizers.includes(org._id) ? (
                        <><FiCheck /> Following</>
                      ) : (
                        'Follow'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="step-actions">
              <button className="skip-btn" onClick={handleSkip} disabled={loading}>
                Skip All <FiSkipForward />
              </button>
              <button className="next-btn" onClick={handleComplete} disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'} <FiCheck />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
