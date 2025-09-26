import { useState, useEffect, useMemo, useRef } from "react";
import dayjs from "dayjs";
import { getPublicPoll, submitPublicVote, clearCachedPoll } from "../api.js";

export default function PublicPollVote({ pollId }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [localVotes, setLocalVotes] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);

  const votesStorageKey = `votes_${pollId}`;

  const refreshIntervalRef = useRef(null);
  const lastForcedFetchRef = useRef(0);

  useEffect(() => {
    if (!pollId) return;

    let active = true;
    let slowLoadingTimer;
    let initialLoadComplete = false;

    const runFetch = async ({ withSpinner = false, force = false } = {}) => {
      if (!active) return;

      if (withSpinner) {
        setLoading(true);
        setError("");
        slowLoadingTimer = setTimeout(() => {
          if (active && !initialLoadComplete) {
            setError("Loading is taking longer than usual. Google Apps Script may be starting up...");
          }
        }, 50000);
      }

      const shouldForce = force || (Date.now() - lastForcedFetchRef.current > 100000);
      if (shouldForce) {
        clearCachedPoll(pollId);
        lastForcedFetchRef.current = Date.now();
      }

      try {
        const res = await getPublicPoll(pollId, { force: shouldForce });
        if (!active) return;

        if (res?.ok && res.poll) {
          initialLoadComplete = true;
          setPoll(res.poll);
          setError("");

          const isClosed = Boolean(res.poll.closeAt) && dayjs().isAfter(dayjs(res.poll.closeAt));
          if (isClosed && refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
        } else if (withSpinner) {
          setError(res?.error || "Poll not found");
        }
      } catch (err) {
        if (withSpinner) {
          setError("Failed to load poll");
        }
      } finally {
        if (withSpinner) {
          clearTimeout(slowLoadingTimer);
          setLoading(false);
        }
      }
    };

    runFetch({ withSpinner: true, force: true });

    refreshIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      runFetch({ force: false });
    }, 5500);

    return () => {
      active = false;
      clearTimeout(slowLoadingTimer);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [pollId]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(votesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLocalVotes(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to restore cached votes:', err);
    }
  }, [votesStorageKey]);

  const inputType = poll?.type === "multiple" ? "checkbox" : "radio";
  
  // Convert votes object to array if needed
  const votesArray = useMemo(() => {
    if (localVotes.length > 0) {
      return localVotes;
    }
    if (!poll) return [];
    if (Array.isArray(poll.votes)) {
      return poll.votes;
    }
    if (poll.votes && typeof poll.votes === 'object') {
      return (poll.options || []).map((_, index) => poll.votes[index] || 0);
    }
    return (poll.options || []).map(() => 0);
  }, [localVotes, poll?.votes, poll?.options]);

  useEffect(() => {
    if (!poll) return;
    let alignedVotes;
    if (Array.isArray(poll.votes)) {
      alignedVotes = poll.votes;
    } else if (poll.votes && typeof poll.votes === 'object') {
      alignedVotes = (poll.options || []).map((_, index) => poll.votes[index] || 0);
    } else {
      alignedVotes = (poll.options || []).map(() => 0);
    }
    setLocalVotes(alignedVotes);
    try {
      sessionStorage.setItem(votesStorageKey, JSON.stringify(alignedVotes));
    } catch (err) {
      console.error('Failed to cache votes:', err);
    }
  }, [poll?.votes, poll?.options, votesStorageKey]);

  const totalVotes = votesArray.reduce((sum, count) => sum + count, 0);
  const closeTime = poll?.closeAt ? dayjs(poll.closeAt) : null;
  const isClosed = closeTime ? closeTime.isBefore(dayjs()) : false;
  const closeLabel = closeTime ? closeTime.format("MMM D, YYYY h:mm A") : "";

  const submitVote = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(""); // Clear previous errors

    if (isClosed) {
      setError("This poll is closed and no longer accepts votes.");
      setSubmitting(false);
      return;
    }

    if (poll.requireName && !name.trim()) {
      setError("Please enter your name.");
      setSubmitting(false);
      return;
    }

    const selected = [...e.currentTarget.querySelectorAll("input[name=vote]:checked")].map(i => +i.value);
    if (selected.length === 0) {
      setError("Please select an option.");
      setSubmitting(false);
      return;
    }
    if (poll.type === "single" && selected.length > 1) {
      setError("Please select only one option.");
      setSubmitting(false);
      return;
    }

    // Check session storage for voting restrictions
    const scope = poll.security === "session"
      ? "session"
      : poll.security === "device"
        ? "device"
        : "none";
    const key = `voted_${scope}_${pollId}`;

    if (scope === "session" && sessionStorage.getItem(key)) {
      setError("You have already voted in this browser session.");
      setSubmitting(false);
      return;
    }
    if (scope === "device") {
      try {
        if (localStorage.getItem(key)) {
          setError("You have already voted on this device.");
          setSubmitting(false);
          return;
        }
      } catch (storageError) {
        console.error('Device vote check failed:', storageError);
      }
    }

    const previousVotes = votesArray.slice();
    const newVotes = previousVotes.map((count, i) =>
      selected.includes(i) ? count + 1 : count
    );

    setPoll(prev => (prev ? { ...prev, votes: newVotes, pending: true } : prev));
    setLocalVotes(newVotes);
    try {
      sessionStorage.setItem(votesStorageKey, JSON.stringify(newVotes));
    } catch (err) {
      console.error('Failed to cache optimistic votes:', err);
    }
    setVoteSubmitted(true);

    try {
      const res = await submitPublicVote(pollId, selected, name);

      if (!res?.ok) {
        throw new Error(res?.error || "Failed to submit vote. Please try again.");
      }

      if (scope === "session") sessionStorage.setItem(key, "1");
      if (scope === "device") {
        try {
          localStorage.setItem(key, "1");
        } catch (storageError) {
          console.error('Failed to persist device vote flag:', storageError);
        }
      }

      let latestPoll = null;

      try {
        clearCachedPoll(pollId);
        const latest = await getPublicPoll(pollId, { force: true });
        if (latest?.ok && latest.poll) {
          const normalizedVotes = Array.isArray(latest.poll.votes)
            ? latest.poll.votes
            : latest.poll.votes && typeof latest.poll.votes === 'object'
              ? (latest.poll.options || []).map((_, index) => latest.poll.votes[index] || 0)
              : (latest.poll.options || []).map(() => 0);
          latestPoll = {
            ...latest.poll,
            votes: normalizedVotes,
            pending: false,
          };
          setPoll(latestPoll);
          setLocalVotes(normalizedVotes);
          sessionStorage.setItem(votesStorageKey, JSON.stringify(normalizedVotes));
        } else {
          setPoll(prev => (prev ? { ...prev, pending: false } : prev));
        }
      } catch (fetchError) {
        console.error('Failed to refresh poll results:', fetchError);
        setPoll(prev => (prev ? { ...prev, pending: false } : prev));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('publicVoteRecorded', {
          detail: {
            pollId,
            poll: latestPoll,
          }
        }));
      }

      try {
        localStorage.setItem('pollingapp_vote_ping', JSON.stringify({ pollId, ts: Date.now() }));
      } catch (pingError) {
        console.error('Failed to broadcast vote ping:', pingError);
      }

      setError('');
    } catch (err) {
      setPoll(prev => (prev ? { ...prev, votes: previousVotes, pending: false } : prev));
      setLocalVotes(previousVotes);
      try {
        sessionStorage.setItem(votesStorageKey, JSON.stringify(previousVotes));
      } catch (storageError) {
        console.error('Failed to restore cached votes:', storageError);
      }
      setVoteSubmitted(false);
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Poll Not Found</h1>
          <p className="text-gray-400">{error || "The poll you're looking for doesn't exist."}</p>
        </div>
      </div>
    );
  }

  const updatedTotalVotes = votesArray.reduce((sum, count) => sum + count, 0);

  if (voteSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-6">
          <span className="inline-flex items-center text-primary font-bold text-2xl tracking-tight" aria-label="uPoll.com brand">
              uPoll.com
            </span>
          </div>
          {/* Back to Vote Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => !submitting && setVoteSubmitted(false)}
              disabled={submitting}
              className={`text-gray-400 transition-colors flex items-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:text-white'}`}
            >
              ← Back to Poll
            </button>
          </div>

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Vote Submitted!</h1>
            <p className="text-gray-400">
              {submitting ? 'Finalizing your vote...' : 'Thank you for participating in this poll.'}
            </p>
          </div>

          {poll.image && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setLightboxImage(poll.image)}
                className="block w-full"
              >
                <img
                  src={poll.image}
                  alt={poll.title || 'Poll illustration'}
                  className="w-full max-h-60 object-cover rounded-lg border border-gray-700 hover:opacity-90"
                />
              </button>
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Results</h3>
            
            <div className="space-y-4">
              {poll.options.map((option, index) => {
                const votes = votesArray[index] || 0;
                const percentage = updatedTotalVotes > 0 ? Math.round((votes / updatedTotalVotes) * 100) : 0;
                
                return (
                  <div key={option.id || index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{option.text}</span>
                      <span className="text-white font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-400">{votes} votes</div>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-gray-700 mt-6 pt-4">
              <div className="text-gray-400">Total votes: <span className="text-white font-bold">{updatedTotalVotes}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center text-primary font-bold text-2xl tracking-tight" aria-label="uPoll.com brand">
            uPoll.com
          </span>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-3">{poll.title}</h1>
          {poll.description && (
            <div className="bg-gray-800/70 border border-gray-700 rounded-lg p-4 text-left mb-4 max-h-48 overflow-y-auto">
              <p className="text-gray-300 whitespace-pre-wrap break-words text-sm">{poll.description}</p>
            </div>
          )}
          {poll.image && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setLightboxImage(poll.image)}
                className="block w-full"
              >
                <img
                  src={poll.image}
                  alt={poll.title || 'Poll illustration'}
                  className="w-full max-h-60 object-cover rounded-lg border border-gray-700 hover:opacity-90"
                />
              </button>
            </div>
          )}
          <p className="text-gray-500 text-sm">
            {poll.type === "multiple" ? "Select multiple options" : "Select one option"}
          </p>
          {closeLabel && (
            <p className={`text-sm mt-2 ${isClosed ? 'text-red-400' : 'text-gray-400'}`}>
              {isClosed ? `Poll closed on ${closeLabel}` : `Poll closes on ${closeLabel}`}
            </p>
          )}
        </div>

        <form onSubmit={submitVote} className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            {poll.options.map((option, i) => (
              <label key={option.id || i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors">
                <input 
                  type={inputType} 
                  name="vote" 
                  value={i} 
                  disabled={isClosed || submitting}
                  className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500 disabled:opacity-50" 
                />
                <span className="text-white">{option.text}</span>
              </label>
            ))}
          </div>

          {isClosed && (
            <div className="bg-red-900/40 border border-red-500 text-red-100 text-sm rounded-lg p-3">
              This poll is closed and no longer accepts votes.
            </div>
          )}

          {poll.requireName && (
            <div>
              <input 
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Your name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                disabled={isClosed || submitting}
              />
            </div>
          )}

          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            type="submit"
            disabled={submitting || isClosed}
          >
            {submitting ? "Submitting..." : "Submit Vote"}
          </button>

          <div className="text-center">
            <p className="text-gray-500 text-sm">{totalVotes} people have voted so far</p>
          </div>
        </form>
      </div>
      {lightboxImage && (
        <button
          type="button"
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
        >
          <img
            src={lightboxImage}
            alt="Full size poll illustration"
            className="max-h-[90vh] max-w-full rounded-lg border border-gray-700"
          />
        </button>
      )}
    </div>
  );
}
