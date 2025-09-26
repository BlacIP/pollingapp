import { useState } from "react";
import { CheckIcon, ClipboardIcon, ShareIcon, EyeIcon } from "./icons.jsx";

export default function PollCreatedSuccess({ poll, onBack, onViewResults, isNewlyCreated = false }) {
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const isSaving = Boolean(poll.pending);
  
  const pollUrl = `${window.location.origin}/?poll=${poll.id}`;
  const title = (poll.title || '').trim() || 'Untitled Poll';
  const description = (poll.description || '').trim();
  const helperMessage = isSaving
    ? "Hang tight! We're saving your poll. You can share it once it's ready."
    : isNewlyCreated
      ? "Share your poll link to start collecting votes."
      : !description
        ? "Share your poll link to collect more votes."
        : '';

  const securityLabels = {
    session: "One vote per browser session",
    none: "No restrictions (multiple votes allowed)",
    device: "One vote per device",
    code: "One vote per unique code"
  };

  const closeLabel = poll.closeAt
    ? new Date(poll.closeAt).toLocaleString()
    : "No close time set";
  
  // Handle votes - convert object to array if needed
  let totalVotes = 0;
  if (Array.isArray(poll.votes)) {
    totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
  } else if (poll.votes && typeof poll.votes === 'object') {
    totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0);
  }
  
  const participants = totalVotes;

  const copyToClipboard = async () => {
    if (isSaving) return;
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareNative = async () => {
    if (isSaving) return;
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
            {title}
          </h1>
          <span className={`${isSaving ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'} text-xs px-2 py-1 rounded-full`}>
            {isSaving ? 'Saving...' : 'Active'}
          </span>
        </div>
        {(description || helperMessage) && (
          <div className="bg-card/40 rounded-lg space-y-2">
            {description && <p className="text-muted whitespace-pre-wrap break-words">{description}</p>}
            {helperMessage && <p className="text-muted">{helperMessage}</p>}
          </div>
        )}
      </div>

      {/* Poll Preview */}
      <div className="card p-4 bg-card/50">
        {/* {description && (
          <p className="text-sm text-muted mb-3 whitespace-pre-wrap break-words">{description}</p>
        )} */}
        {poll.image && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setPreviewImage({ src: poll.image, alt: title })}
              className="block w-full"
            >
              <img
                src={poll.image}
                alt={title}
                className="w-full max-h-60 object-cover rounded-lg border border-gray-700 hover:opacity-90"
              />
            </button>
          </div>
        )}
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

      <div className="card p-4 bg-card/50">
        <h3 className="text-sm text-muted mb-3">Poll Settings</h3>
        <ul className="space-y-1 text-sm text-muted">
          <li>
            <span className="font-medium text-text">Selection:</span> {poll.type === 'multiple' ? 'Multiple selections allowed' : 'Single selection only'}
          </li>
          <li>
            <span className="font-medium text-text">Participant name:</span> {poll.requireName ? 'Required' : 'Optional'}
          </li>
          <li>
            <span className="font-medium text-text">Voting security:</span> {securityLabels[poll.security] || 'Standard restrictions'}
          </li>
          <li>
            <span className="font-medium text-text">Close time:</span> {closeLabel}
          </li>
        </ul>
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
            className="btn btn-ghost px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy link"
            disabled={isSaving}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
          </button>
        </div>

        <button
          onClick={shareNative}
          className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
        >
          <ShareIcon className="h-4 w-4" />
          Share Poll
        </button>

        <button
          onClick={copyToClipboard}
          className="btn btn-ghost w-full disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
        >
          Copy Link
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
        className="btn btn-ghost w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSaving}
      >
        <EyeIcon className="h-4 w-4" />
        View Results
      </button>

      <p className="text-sm text-muted text-center">
        {isSaving
          ? "Your poll will appear shortly. This page will refresh automatically once it's ready."
          : "Your poll is now live and accepting votes. You can view real-time results anytime."}
      </p>

      {previewImage && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            className="max-h-[90vh] max-w-full object-contain rounded-lg border border-gray-700"
          />
        </button>
      )}
    </div>
  );
}
