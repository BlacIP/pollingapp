import { useEffect, useState } from "react";
import CreatePollForm from "./components/CreatePollForm.jsx";
import PollCard from "./components/PollCard.jsx";
import PollList from "./components/PollList.jsx";
import PollCreatedSuccess from "./components/PollCreatedSuccess.jsx";
import ShareModal from "./components/ShareModal.jsx";
import AuthPage from "./auth/AuthPage.jsx";
import { myPolls, createPoll, updatePollStatus, permanentlyDeletePoll, clearUserPollsCache, getStoredAuth, storeAuth, clearAuth, markAuthLoggedOut, setUserPollsCache, startBackgroundSync, stopBackgroundSync, clearCachedPoll, setCachedPoll } from "./api.js";
import PollResults from "./components/PollResults.jsx";
import PublicPollVote from "./components/PublicPollVote.jsx";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [polls, setPolls] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [livePolls, setLivePolls] = useState(() => {
    try {
      const raw = localStorage.getItem('pollingapp_live_results');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to restore live polling preferences:', err);
    }
    return {};
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);
  const [creating, setCreating] = useState(false);

  // Restore auth and check if still valid
  useEffect(() => {
    const storedAuth = getStoredAuth();

    if (storedAuth) {
      if (!storedAuth.loggedOut) {
        const { loggedOut: _unused, ...authPayload } = storedAuth;
        setAuth(authPayload);
      }
    } else {
      clearAuth();
      clearUserPollsCache();
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
    storeAuth(authData.token, authData.user);
    setAuth(authData);
  };

  const handleSignOut = () => {
    setAuth(null);
    markAuthLoggedOut();
    clearUserPollsCache();
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

  // Background sync to keep polls fresh
  useEffect(() => {
    if (!auth?.token) return;

    try {
      startBackgroundSync(auth.token);
    } catch (error) {
      console.error("Error starting background sync:", error);
    }

    const handlePollsUpdated = (event) => {
      const { polls: updatedPolls, source } = event.detail || {};
      if (source === 'background' && Array.isArray(updatedPolls)) {
        setPolls(prev => {
          const pendingPolls = prev.filter(poll => poll.pending);
          const merged = [...pendingPolls, ...updatedPolls];
          setUserPollsCache(merged);
          return merged;
        });
      } else {
        console.error('Invalid polls data received during background sync:', updatedPolls);
      }
    };

    window.addEventListener('pollsUpdated', handlePollsUpdated);

    return () => {
      try {
        stopBackgroundSync();
      } catch (error) {
        console.error("Error stopping background sync:", error);
      }
      window.removeEventListener('pollsUpdated', handlePollsUpdated);
    };
  }, [auth?.token, livePolls]);

  // Force-refresh owner views when a public vote is recorded
  useEffect(() => {
    if (!auth?.token) return;

    let cancelled = false;

    const handlePublicVoteRecorded = async (event) => {
      const { pollId, poll: updatedPoll } = event.detail || {};
      if (!pollId) return;

      try {
        clearCachedPoll(pollId);

        if (updatedPoll) {
          let merged = false;
          setPolls(prev => {
            const index = prev.findIndex(p => p.id === pollId);
            if (index === -1) {
              return prev;
            }

            merged = true;
            const next = [...prev];
            const current = prev[index];
            const normalizedVotes = Array.isArray(updatedPoll.votes) ? updatedPoll.votes : current.votes;
            const mergedPoll = {
              ...current,
              ...updatedPoll,
              votes: normalizedVotes,
            };
            next[index] = mergedPoll;

            setUserPollsCache(next);
            setCachedPoll(mergedPoll.id, mergedPoll);

            return next;
          });
          if (merged) {
            return;
          }
        }

        if (!cancelled) {
          const refreshed = await myPolls(auth.token, { force: true });
          if (refreshed?.ok) {
            setPolls(refreshed.polls || []);
            setUserPollsCache(refreshed.polls || []);
          }
        }
      } catch (error) {
        console.error('Failed to refresh polls after public vote:', error);
      }
    };

    window.addEventListener('publicVoteRecorded', handlePublicVoteRecorded);
    return () => {
      cancelled = true;
      window.removeEventListener('publicVoteRecorded', handlePublicVoteRecorded);
    };
  }, [auth?.token]);

  // Listen for vote pings from other tabs/windows
  useEffect(() => {
    if (!auth?.token) return;

    const handleStoragePing = (event) => {
      if (event.key !== 'pollingapp_vote_ping' || !event.newValue) return;

      let payload = null;
      try {
        payload = JSON.parse(event.newValue);
      } catch (err) {
        console.error('Failed to parse vote ping payload:', err);
      }

      const pollId = payload?.pollId;
      if (!pollId || !livePolls[pollId]) return;

      (async () => {
        try {
          clearCachedPoll(pollId);
          const refreshed = await myPolls(auth.token, { force: true });
          if (refreshed?.ok) {
            setPolls(refreshed.polls || []);
            setUserPollsCache(refreshed.polls || []);
          }
        } catch (err) {
          console.error('Failed to refresh after vote ping:', err);
        }
      })();
    };

    window.addEventListener('storage', handleStoragePing);
    return () => window.removeEventListener('storage', handleStoragePing);
  }, [auth?.token]);

  // Continuously refresh the active poll when live mode is enabled
  useEffect(() => {
    if (!auth?.token || !showResults || !activeId) return;
    const liveEnabled = Boolean(livePolls[activeId]);
    if (!liveEnabled) return;

    let cancelled = false;

    const pullLatest = async () => {
      try {
        const res = await myPolls(auth.token, { force: true });
        if (!cancelled && res?.ok) {
          setPolls(res.polls || []);
          setUserPollsCache(res.polls || []);
        }
      } catch (err) {
        console.error('Live refresh failed:', err);
      }
    };

    pullLatest();
    const interval = setInterval(pullLatest, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [auth?.token, showResults, activeId, livePolls[activeId]]);

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

  // Optimistic poll creation
  const addPoll = async (pollData) => {
    setError("");
    setCreating(true);

    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const tempPoll = {
      ...pollData,
      id: tempId,
      pending: true,
      pendingAction: null,
      status: 'active',
      created_at: pollData.created_at || now,
      updated_at: pollData.updated_at || now,
      votes: Array.isArray(pollData.votes)
        ? pollData.votes
        : pollData.options.map(() => 0),
    };

    setPolls(prev => {
      const updated = [tempPoll, ...prev];
      setUserPollsCache(updated);
      return updated;
    });
    setActiveId(tempId);
    setShowSuccess(true);
    setShowResults(false);
    setIsNewlyCreated(true);

    try {
      const res = await createPoll(auth.token, pollData);

      if (res?.ok && res.poll) {
        setPolls(prev => {
          const updated = prev.map(poll =>
            poll.id === tempId ? { ...res.poll, pending: false, pendingAction: null } : poll
          );
          setUserPollsCache(updated);
          return updated;
        });
        setActiveId(res.poll.id);
      } else {
        setPolls(prev => {
          const updated = prev.filter(poll => poll.id !== tempId);
          setUserPollsCache(updated);
          return updated;
        });
        setActiveId(null);
        setShowSuccess(false);
        setShowResults(false);
        setIsNewlyCreated(false);
        setError(res?.error || "Failed to create poll");
      }
    } catch (error) {
      setPolls(prev => {
        const updated = prev.filter(poll => poll.id !== tempId);
        setUserPollsCache(updated);
        return updated;
      });
      setActiveId(null);
      setShowSuccess(false);
      setShowResults(false);
      setIsNewlyCreated(false);
      setError(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };


  const handleStatusChange = async (pollId, newStatus) => {
    const previousPolls = polls.map(p => ({ ...p }));
    setPolls(prev => {
      const updated = prev.map(poll =>
        poll.id === pollId
          ? {
              ...poll,
              pending: true,
              pendingAction: newStatus
            }
          : poll
      );
      setUserPollsCache(updated);
      return updated;
    });

    try {
      const res = await updatePollStatus(auth.token, pollId, newStatus);
      if (res?.ok) {
        // Update local state
        setPolls(prev => {
          const updated = prev.map(poll => 
            poll.id === pollId 
              ? { 
                  ...poll, 
                  status: newStatus,
                  pending: false,
                  pendingAction: null,
                  ...(newStatus === 'deleted'
                    ? { deleted_at: new Date().toISOString() }
                    : { deleted_at: newStatus === 'active' ? null : poll.deleted_at })
                }
              : poll
          );
          setUserPollsCache(updated);
          return updated;
        });
        
        // If current active poll was deleted/disabled, close it
        if (pollId === activeId && (newStatus === 'deleted' || newStatus === 'disabled')) {
          setActiveId(null);
          setShowSuccess(false);
        }
      } else {
        setError(res?.error || 'Failed to update poll status');
      }
    } catch (err) {
      setPolls(previousPolls);
      setUserPollsCache(previousPolls);
      setError('Failed to update poll status');
    }
  };

  const deletePollLocal = async (pollId, permanent = false) => {
    const previousPolls = polls.map(p => ({ ...p }));
    if (permanent) {
      setPolls(prev => {
        const updated = prev.map(poll =>
          poll.id === pollId
            ? { ...poll, pending: true, pendingAction: 'permanent_delete' }
            : poll
        );
        setUserPollsCache(updated);
        return updated;
      });

      try {
        const res = await permanentlyDeletePoll(auth.token, pollId);
        if (res?.ok) {
          setPolls(prev => {
            const updated = prev.filter(p => p.id !== pollId);
            setUserPollsCache(updated);
            return updated;
          });
          if (activeId === pollId) {
            setActiveId(null);
            setShowSuccess(false);
          }
        } else {
          setPolls(previousPolls);
          setUserPollsCache(previousPolls);
          setError(res?.error || 'Failed to delete poll permanently');
        }
      } catch (err) {
        setPolls(previousPolls);
        setUserPollsCache(previousPolls);
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

  const handleLiveToggle = (pollId, enabled) => {
    setLivePolls(prev => {
      const next = { ...prev };
      if (enabled) {
        next[pollId] = true;
      } else {
        delete next[pollId];
      }
      try {
        localStorage.setItem('pollingapp_live_results', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to persist live polling preferences:', err);
      }
      return next;
    });
  };

  const handleOpenPoll = (id) => {
    setActiveId(id);
    setShowSuccess(true);
    setIsNewlyCreated(false); // This is an existing poll
  };

  // Determine what to show in main section
  const renderMainContent = () => {
    if (loading && polls.length === 0) {
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
          livePolling={Boolean(livePolls[activePoll.id])}
          onToggleLivePolling={(value) => handleLiveToggle(activePoll.id, value)}
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
    return <CreatePollForm onCreate={addPoll} loading={creating} />;
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <header className="my-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center text-primary font-bold text-2xl tracking-tight" aria-label="uPoll.com brand">
              uPoll.com
            </span>
            {/* <h1 className="text-3xl font-semibold">
              {showResults
                ? activePoll?.title || 'Poll Results'
                : showSuccess
                  ? (isNewlyCreated ? 'Poll Created!' : activePoll?.title || 'Saved Poll')
                  : 'Create a Poll'}
            </h1> */}
          </div>
          {/* <p className="text-muted max-w-2xl">
            {showResults 
              ? 'View detailed poll results and analytics.'
              : showSuccess 
                ? (isNewlyCreated
                    ? 'Share your poll link to start collecting votes.'
                    : activePoll?.description || 'Share your poll link to collect more votes.')
                : 'Complete the fields below to create your poll.'}
          </p> */}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted">Welcome, {auth.user.name || auth.user.email}</span>
          <button onClick={handleSignOut} className="btn btn-ghost">
            Sign Out
          </button>
        </div>
      </header>

      {error && <div className="card p-3 mb-4 text-red-400">{error}</div>}

      <main className="grid gap-6 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <section className="card p-6 sticky top-6 self-start max-h-[calc(100vh-9rem)] overflow-y-auto">
          {renderMainContent()}
        </section>

        <aside className="card p-6 h-[calc(100vh-9rem)] overflow-y-auto">
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
