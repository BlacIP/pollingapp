import { useState } from "react";
import { createPoll } from "../api.js";

export default function RetrySync({ localPolls, auth, onSuccess }) {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState([]);

  const syncPolls = async () => {
    setSyncing(true);
    setResults([]);
    
    const syncResults = [];
    
    for (const poll of localPolls) {
      try {
        const res = await createPoll(auth.token, poll);
        if (res?.ok && res.poll) {
          syncResults.push({ poll: poll.title, status: 'success', remotePoll: res.poll });
        } else {
          syncResults.push({ poll: poll.title, status: 'failed', error: res?.error });
        }
      } catch (error) {
        syncResults.push({ poll: poll.title, status: 'failed', error: error.message });
      }
    }
    
    setResults(syncResults);
    setSyncing(false);
    
    // Call success callback with successfully synced polls
    const successfulPolls = syncResults.filter(r => r.status === 'success');
    if (successfulPolls.length > 0) {
      onSuccess(successfulPolls);
    }
  };

  if (localPolls.length === 0) return null;

  return (
    <div className="card p-4 mb-4 border-orange-500/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-orange-400">Local Polls Not Synced</h4>
          <p className="text-sm text-muted">
            {localPolls.length} poll{localPolls.length !== 1 ? 's' : ''} saved locally only
          </p>
        </div>
        <button
          onClick={syncPolls}
          disabled={syncing}
          className="btn btn-primary"
        >
          {syncing ? 'Syncing...' : 'Sync to Excel'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span>{result.poll}</span>
              <span className={result.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                {result.status === 'success' ? '✓ Synced' : `✗ ${result.error}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}