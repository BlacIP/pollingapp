import { useEffect, useState } from "react";
import CreatePollForm from "./components/CreatePollForm.jsx";
import PollCard from "./components/PollCard.jsx";
import PollList from "./components/PollList.jsx";
import PollCreatedSuccess from "./components/PollCreatedSuccess.jsx";
import ShareModal from "./components/ShareModal.jsx";
import AuthPage from "./auth/AuthPage.jsx";
import { myPolls, createPoll, updatePollStatus, permanentlyDeletePoll, startBackgroundSync, stopBackgroundSync } from "./api.js";
import PollResults from "./components/PollResults.jsx";
import PublicPollVote from "./components/PublicPollVote.jsx";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [polls, setPolls] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);

  // Restore auth and check if still valid
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const user = localStorage.getItem("auth_user");
    const loginTime = localStorage.getItem("auth_login_time");
    
    if (token && user && loginTime) {
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (now - parseInt(loginTime) < twentyFourHours) {
        setAuth({ token, user: JSON.parse(user) });
      } else {
        // Session expired, clear auth
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_login_time");
      }
    }
    setAuthLoaded(true);
  }, []);

  // Load polls from remote with caching
  useEffect(() => {
    if (!auth) return;
    
    const loadRemotePolls = async () => {
      setLoading(true);
      setError("");
      
      try {
        console.log("Loading polls with token:", auth.token);
        const res = await myPolls(auth.token);
        console.log("Polls response:", res);
        
        if (res?.ok) {
          console.log("Setting polls from cache/API:", res.polls?.length || 0, "polls");
          setPolls(res.polls || []);
        } else {
          console.error("Failed to load polls:", res?.error);
          setError(res?.error || "Failed to load polls");
        }
      } catch (error) {
        console.error("Network error loading polls:", error);
        setError("Network error loading polls");
      } finally {
        setLoading(false);
      }
    };

    loadRemotePolls();
  }, [auth]);

  const handleSignIn = (authData) => {
    setAuth(authData);
    localStorage.setItem("auth_login_time", Date.now().toString());
  };

  const handleSignOut = () => {
    setAuth(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_login_time");
    setPolls([]);
    setActiveId(null);
    setShowSuccess(false);
    setShowResults(false);
  };

  // Check for public poll access first
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pollId = urlParams.get('poll');
    
    // If there's a poll ID in URL and no auth, show public voting interface
    if (pollId && !auth) {
      // Don't redirect to auth, show public poll instead
      return;
    }
  }, []);

  // Check for poll parameter after auth is loaded
  useEffect(() => {
    if (authLoaded && auth && polls.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const pollId = urlParams.get('poll');
      if (pollId) {
        const poll = polls.find(p => p.id === pollId);
        if (poll) {
          setActiveId(pollId);
          setShowSuccess(true);
          setIsNewlyCreated(false);
        }
      }
    }
  }, [authLoaded, auth, polls]);

  // Show loading while checking auth
  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if this is a public poll access
  const urlParams = new URLSearchParams(window.location.search);
  const publicPollId = urlParams.get('poll');
  
  if (publicPollId && !auth) {
    return <PublicPollVote pollId={publicPollId} />;
  }

  if (!auth) return <AuthPage onSignedIn={handleSignIn} />;

  const activePoll = polls.find(p => p.id === activeId) || null;

  // Optimistic poll creation - add temp poll immediately, save in background
  const addPoll = async (pollData) => {
    setError("");
    setLoading(true);
    
    try {
      // Create temporary poll for immediate UI update
      const tempPoll = {
        id: 'temp_' + Date.now(),
        ...pollData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        votes: pollData.options.map(() => 0),
        vote_count: 0,
        pending: true
      };

      // Add temp poll to UI immediately
      setPolls(prev => [tempPoll, ...prev]);
      setActiveId(tempPoll.id);
      setShowSuccess(true);
      setIsNewlyCreated(true);
      setLoading(false);

      // Submit in background
      setTimeout(async () => {
        try {
          const res = await createPoll(auth.token, pollData);
          
          if (res?.ok && res.poll) {
            // Replace temp poll with real poll
            setPolls(prev => prev.map(p => 
              p.id === tempPoll.id ? { ...res.poll, pending: false } : p
            ));
            
            // Update active poll if it's the temp one
            if (activeId === tempPoll.id) {
              setActiveId(res.poll.id);
            }
          } else {
            // Remove temp poll on failure
            setPolls(prev => prev.filter(p => p.id !== tempPoll.id));
            setError(`Failed to create poll: ${res?.error}`);
            
            // Close success view if temp poll was active
            if (activeId === tempPoll.id) {
              setActiveId(null);
              setShowSuccess(false);
            }
          }
        } catch (error) {
          // Remove temp poll on error
          setPolls(prev => prev.filter(p => p.id !== tempPoll.id));
          setError(`Error creating poll: ${error.message}`);
          
          if (activeId === tempPoll.id) {
            setActiveId(null);
            setShowSuccess(false);
          }
        }
      }, 100);

    } catch (error) {
      setError(`Error: ${error.message}`);
      setLoading(false);
    }
  };


  const handleStatusChange = async (pollId, newStatus) => {
    try {
      const res = await updatePollStatus(auth.token, pollId, newStatus);
      if (res?.ok) {
        // Update local state
        setPolls(prev => prev.map(poll => 
          poll.id === pollId 
            ? { 
                ...poll, 
                status: newStatus,
                ...(newStatus === 'deleted' ? { deleted_at: new Date().toISOString() } : {})
              }
            : poll
        ));
        
        // If current active poll was deleted/disabled, close it
        if (pollId === activeId && (newStatus === 'deleted' || newStatus === 'disabled')) {
          setActiveId(null);
          setShowSuccess(false);
        }
      } else {
        setError(res?.error || 'Failed to update poll status');
      }
    } catch (err) {
      setError('Failed to update poll status');
    }
  };

  const deletePollLocal = async (pollId, permanent = false) => {
    if (permanent) {
      try {
        const res = await permanentlyDeletePoll(auth.token, pollId);
        if (res?.ok) {
          setPolls(polls.filter(p => p.id !== pollId));
          if (activeId === pollId) {
            setActiveId(null);
            setShowSuccess(false);
          }
        } else {
          setError(res?.error || 'Failed to delete poll permanently');
        }
      } catch (err) {
        setError('Failed to delete poll permanently');
      }
    } else {
      // Soft delete - move to trash
      handleStatusChange(pollId, 'deleted');
    }
  };

  const handleBackToPolls = () => {
    setActiveId(null);
    setShowSuccess(false);
    setShowResults(false);
    setIsNewlyCreated(false);
  };

  const handleViewResults = () => {
    setShowSuccess(false);
    setShowResults(true);
  };

  const handleOpenPoll = (id) => {
    setActiveId(id);
    setShowSuccess(true);
    setIsNewlyCreated(false); // This is an existing poll
  };

  // Determine what to show in main section
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <p className="text-muted">Loading...</p>
        </div>
      );
    }

    // Show results view
    if (showResults && activePoll) {
      return (
        <PollResults
          poll={activePoll}
          onBack={handleBackToPolls}
          onShare={() => setShareOpen(true)}
        />
      );
    }

    // Show success view for both newly created polls and existing polls
    if (showSuccess && activePoll) {
      return (
        <PollCreatedSuccess
          poll={activePoll}
          onBack={handleBackToPolls}
          onViewResults={handleViewResults}
          isNewlyCreated={isNewlyCreated}
        />
      );
    }
    
    // Default: show create form
    return <CreatePollForm onCreate={addPoll} loading={loading} />;
  };

  // Add background sync effect
  useEffect(() => {
    if (!auth?.token) return;
    
    // Start background sync
    startBackgroundSync(auth.token);
    
    // Listen for background poll updates
    const handlePollsUpdated = (event) => {
      const { polls: updatedPolls, source } = event.detail;
      if (source === 'background') {
        console.log('Background sync: Updating polls in UI');
        setPolls(updatedPolls);
      }
    };
    
    window.addEventListener('pollsUpdated', handlePollsUpdated);
    
    // Cleanup
    return () => {
      stopBackgroundSync();
      window.removeEventListener('pollsUpdated', handlePollsUpdated);
    };
  }, [auth?.token]);

  return (
    <div className="max-w-5xl mx-auto px-4">
      <header className="my-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">
            {showResults ? activePoll?.title : showSuccess ? (isNewlyCreated ? "Poll Created!" : activePoll?.title) : "Create a Poll"}
          </h1>
          <p className="text-muted -mt-1">
            {showResults 
              ? "View detailed poll results and analytics"
              : showSuccess 
                ? (isNewlyCreated ? "Share your poll link to start collecting votes" : (activePoll?.description || "Share your poll link to collect more votes"))
                : "Complete the fields below to create your poll"
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted">Welcome, {auth.user.name || auth.user.email}</span>
          <button onClick={handleSignOut} className="btn btn-ghost">
            Sign Out
          </button>
        </div>
      </header>

      {error && <div className="card p-3 mb-4 text-red-400">{error}</div>}

      <main className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <section className="card p-5">
          {renderMainContent()}
        </section>

        <aside className="card p-5 h-fit">
          <PollList 
            polls={polls} 
            onOpen={handleOpenPoll} 
            activePollId={activeId}
            loading={loading}
            onViewResults={(pollId) => {
              setActiveId(pollId);
              setShowSuccess(false);
              setShowResults(true);
              setIsNewlyCreated(false);
            }}
            onShare={(poll) => {
              setActiveId(poll.id);
              setShareOpen(true);
            }}
            onDelete={deletePollLocal}
            onStatusChange={handleStatusChange}
          />
        </aside>
      </main>

      {shareOpen && activePoll && (
        <ShareModal
          poll={activePoll}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
