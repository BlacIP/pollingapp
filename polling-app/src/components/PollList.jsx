import { useState } from 'react';

export default function PollList({ polls, onOpen, activePollId, loading, onViewResults, onShare, onDelete }) {
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
      case 'delete':
        if (confirm(`Delete "${poll.title}"?`)) {
          onDelete(poll.id);
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
          
          // Handle votes - convert object to array if needed
          let totalVotes = 0;
          if (Array.isArray(poll.votes)) {
            totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
          } else if (poll.votes && typeof poll.votes === 'object') {
            totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0);
          }
          
          // Determine poll status
          const now = new Date();
          const isExpired = poll.closeAt && new Date(poll.closeAt) < now;
          const status = isExpired ? 'closed' : 'active';
          
          // Format created date
          const createdDate = poll.created_at ? new Date(poll.created_at).toLocaleDateString() : '';
          
          return (
            <div
              key={pollId}
              onClick={() => onOpen(pollId)}
              className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                isActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700/70'
              }`}
            >
              {/* Three dots menu */}
              <div className="absolute top-3 right-3">
                <button 
                  onClick={(e) => handleMenuClick(e, pollId)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  ⋯
                </button>
                
                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-2 min-w-[140px] z-10">
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
                    <button
                      onClick={(e) => handleMenuAction(e, 'delete', poll)}
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                      <span>🗑</span>
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              {/* Poll title */}
              <h4 className="text-white font-medium text-base mb-2 pr-8 leading-tight">
                {poll.title}
              </h4>
              
              {/* Response count and status */}
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
                
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  status === 'active' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-500 text-white'
                }`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Click outside to close menu */}
      {openMenuId && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}
