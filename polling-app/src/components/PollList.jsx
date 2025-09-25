import { useState } from 'react';
import { POLL_STATUS, STATUS_LABELS, STATUS_COLORS, getAvailableActions, getActionLabel } from '../utils/pollStatus.js';

export default function PollList({ polls, onOpen, activePollId, loading, onViewResults, onShare, onDelete, onStatusChange }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">Loading polls...</p>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">No polls yet</p>
        <p className="text-sm text-muted mt-1">Create your first poll to get started</p>
      </div>
    );
  }

  const handleMenuClick = (e, pollId) => {
    e.stopPropagation();
    const target = polls.find(p => p.id === pollId);
    if (target?.pending) {
      return;
    }
    setOpenMenuId(openMenuId === pollId ? null : pollId);
  };

  const handleMenuAction = (e, action, poll) => {
    e.stopPropagation();
    setOpenMenuId(null);
    
    switch (action) {
      case 'view':
        onViewResults(poll.id);
        break;
      case 'share':
        onShare(poll);
        break;
      case 'activate':
        onStatusChange(poll.id, POLL_STATUS.ACTIVE);
        break;
      case 'disable':
        onStatusChange(poll.id, POLL_STATUS.DISABLED);
        break;
      case 'archive':
        onStatusChange(poll.id, POLL_STATUS.ARCHIVED);
        break;
      case 'delete':
        if (confirm(`Move "${poll.title}" to trash?`)) {
          onStatusChange(poll.id, POLL_STATUS.DELETED);
        }
        break;
      case 'restore':
        onStatusChange(poll.id, POLL_STATUS.ACTIVE);
        break;
      case 'permanent_delete':
        if (confirm(`Permanently delete "${poll.title}"? This cannot be undone.`)) {
          onDelete(poll.id, true);
        }
        break;
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4 text-white">Saved Polls</h3>
      
      <div className="space-y-3">
        {polls.map((poll) => {
          const pollId = poll.id;
          const isActive = pollId === activePollId;
          const isMenuOpen = openMenuId === pollId;
          const status = poll.status || POLL_STATUS.ACTIVE;
          const availableActions = poll.pending ? [] : getAvailableActions(status);
          
          let totalVotes = 0;
          if (Array.isArray(poll.votes)) {
            totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
          } else if (poll.votes && typeof poll.votes === 'object') {
            totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0);
          }
          
          const createdDate = poll.created_at ? new Date(poll.created_at).toLocaleDateString() : '';
          
          return (
            <div
              key={pollId}
              onClick={() => status !== POLL_STATUS.DELETED && onOpen(pollId)}
              className={`relative p-4 rounded-lg border transition-all ${
                status === POLL_STATUS.DELETED 
                  ? 'border-red-600 bg-red-900/20 opacity-75' 
                  : isActive 
                    ? 'border-primary bg-primary/10 cursor-pointer' 
                    : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700/70 cursor-pointer'
              } ${poll.pending ? 'opacity-70 border-yellow-500' : ''}`}
            >
              <div className="absolute top-3 right-3">
                <button 
                  onClick={(e) => handleMenuClick(e, pollId)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  ⋯
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-2 min-w-[160px] z-10">
                    {!poll.pending && status !== POLL_STATUS.DELETED && (
                      <>
                        <button
                          onClick={(e) => handleMenuAction(e, 'view', poll)}
                          className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 text-sm"
                        >
                          <span>👁</span>
                          View Results
                        </button>
                        <button
                          onClick={(e) => handleMenuAction(e, 'share', poll)}
                          className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 text-sm"
                        >
                          <span>🔗</span>
                          Share Poll
                        </button>
                        <div className="border-t border-gray-600 my-1"></div>
                      </>
                    )}
                    
                    {availableActions.map(action => (
                      <button
                        key={action}
                        onClick={(e) => handleMenuAction(e, action, poll)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2 text-sm ${
                          action === 'permanent_delete' ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        <span>
                          {action === 'activate' && '✅'}
                          {action === 'disable' && '⏸'}
                          {action === 'archive' && '📦'}
                          {action === 'delete' && '🗑'}
                          {action === 'restore' && '♻️'}
                          {action === 'permanent_delete' && '💀'}
                        </span>
                        {getActionLabel(action)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <h4 className="text-white font-medium text-base mb-2 pr-8 leading-tight">
                {poll.title}
                {status === POLL_STATUS.DELETED && (
                  <span className="text-red-400 text-sm ml-2">(Deleted)</span>
                )}
                {poll.pending && (
                  <span className="text-yellow-400 text-sm ml-2">(Saving...)</span>
                )}
              </h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">
                    {totalVotes} response{totalVotes !== 1 ? 's' : ''}
                  </p>
                  {createdDate && (
                    <p className="text-gray-500 text-xs">
                      Created {createdDate}
                    </p>
                  )}
                </div>
                
                <span className={`px-2 py-1 rounded text-xs font-medium ${poll.pending ? 'bg-yellow-400 text-black' : STATUS_COLORS[status]}`}>
                  {poll.pending ? 'Saving...' : STATUS_LABELS[status]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {openMenuId && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}
