import { useState, useEffect, useMemo } from "react";
import { getPublicPoll, submitPublicVote } from "../api.js";

export default function PublicPollVote({ pollId }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  useEffect(() => {
    const loadPoll = async () => {
      setLoading(true);
      setError("");
      
      try {
        const res = await getPublicPoll(pollId);
        if (res?.ok && res.poll) {
          setPoll(res.poll);
        } else {
          setError(res?.error || "Poll not found");
        }
      } catch (err) {
        setError("Failed to load poll");
      } finally {
        setLoading(false);
      }
    };

    if (pollId) {
      loadPoll();
    }
  }, [pollId]);

  const inputType = poll?.type === "multiple" ? "checkbox" : "radio";
  
  // Convert votes object to array if needed
  const votesArray = useMemo(() => {
    if (!poll) return [];
    if (Array.isArray(poll.votes)) {
      return poll.votes;
    } else if (poll.votes && typeof poll.votes === 'object') {
      return poll.options.map((_, index) => poll.votes[index] || 0);
    } else {
      return poll.options.map(() => 0);
    }
  }, [poll?.votes, poll?.options]);

  const totalVotes = votesArray.reduce((sum, count) => sum + count, 0);

  const submitVote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(""); // Clear previous errors

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
    const scope = poll.security === "session" ? "session" : "none";
    const key = `voted_${scope}_${pollId}`;

    if (scope === "session" && sessionStorage.getItem(key)) {
      setError("You have already voted in this browser session.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await submitPublicVote(pollId, selected, name);
      
      if (res?.ok) {
        // Update local poll data with new votes
        const newVotes = votesArray.map((count, i) => 
          selected.includes(i) ? count + 1 : count
        );
        setPoll(prev => ({ ...prev, votes: newVotes }));
        
        if (scope === "session") sessionStorage.setItem(key, "1");
        setVoteSubmitted(true);
      } else {
        setError(res?.error || "Failed to submit vote. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
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
          {/* Back to Vote Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setVoteSubmitted(false)}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
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
            <p className="text-gray-400">Thank you for participating in this poll.</p>
          </div>

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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-3">{poll.title}</h1>
          {poll.description && <p className="text-gray-400 mb-4">{poll.description}</p>}
          <p className="text-gray-500 text-sm">
            {poll.type === "multiple" ? "Select multiple options" : "Select one option"}
          </p>
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
                  className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500" 
                />
                <span className="text-white">{option.text}</span>
              </label>
            ))}
          </div>

          {poll.requireName && (
            <div>
              <input 
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Your name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>
          )}

          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Vote"}
          </button>

          <div className="text-center">
            <p className="text-gray-500 text-sm">{totalVotes} people have voted so far</p>
          </div>
        </form>
      </div>
    </div>
  );
}
