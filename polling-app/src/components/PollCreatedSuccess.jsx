import { useState } from "react";

export default function PollCreatedSuccess({ poll, onBack, onViewResults, isNewlyCreated = false }) {
  const [copied, setCopied] = useState(false);
  
  const pollUrl = `${window.location.origin}/?poll=${poll.id}`;
  
  // Handle votes - convert object to array if needed
  let totalVotes = 0;
  if (Array.isArray(poll.votes)) {
    totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
  } else if (poll.votes && typeof poll.votes === 'object') {
    totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0);
  }
  
  const participants = totalVotes;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: poll.title,
          text: `Vote on: ${poll.title}`,
          url: pollUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="text-muted hover:text-text transition-colors"
        >
          ← Back to polls
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {isNewlyCreated ? "Poll Created!" : poll.title}
          </h1>
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            Active
          </span>
        </div>
        <p className="text-muted">
          {isNewlyCreated 
            ? "Share your poll link to start collecting votes." 
            : poll.description || "Share your poll link to collect more votes."
          }
        </p>
      </div>

      {/* Poll Preview */}
      <div className="card p-4 bg-card/50">
        <h3 className="text-lg font-medium mb-3">{poll.title}</h3>
        
        <div className="space-y-2">
          <p className="text-sm text-muted">Options:</p>
          <ol className="space-y-1">
            {poll.options.map((option, index) => (
              <li key={option.id || index} className="text-muted">
                {index + 1}. {option.text}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Share Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Share Poll</h3>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={pollUrl}
            readOnly
            className="input flex-1 bg-card/50 text-sm"
          />
          <button
            onClick={copyToClipboard}
            className="btn btn-ghost px-3"
            title="Copy link"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>

        <button
          onClick={shareNative}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <span>🔗</span>
          Share Poll
        </button>

        <button
          onClick={copyToClipboard}
          className="btn btn-ghost w-full"
        >
          📋 Copy Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center bg-card/50">
          <div className="text-2xl font-bold">{totalVotes}</div>
          <div className="text-sm text-muted">Total Votes</div>
        </div>
        <div className="card p-4 text-center bg-card/50">
          <div className="text-2xl font-bold">{participants}</div>
          <div className="text-sm text-muted">Participants</div>
        </div>
      </div>

      {/* View Results */}
      <button
        onClick={onViewResults}
        className="btn btn-ghost w-full flex items-center justify-center gap-2"
      >
        <span>👁</span>
        View Results
      </button>

      <p className="text-sm text-muted text-center">
        Your poll is now live and accepting votes. You can view real-time results anytime.
      </p>
    </div>
  );
}
