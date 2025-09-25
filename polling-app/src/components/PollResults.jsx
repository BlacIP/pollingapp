import { useState } from "react";
import {
  BarChartIcon,
  UsersIcon,
  CalendarIcon,
  StarIcon,
  ShareIcon,
  DownloadIcon
} from "./icons.jsx";

export default function PollResults({ poll, onBack, onShare }) {
  const [copied, setCopied] = useState(false);

  // Convert votes object to array if needed
  const votesArray = Array.isArray(poll.votes) 
    ? poll.votes 
    : poll.votes && typeof poll.votes === 'object'
      ? poll.options.map((_, index) => poll.votes[index] || 0)
      : poll.options.map(() => 0);

  const totalVotes = votesArray.reduce((sum, count) => sum + count, 0);
  const participants = totalVotes; // Assuming 1 vote per participant

  // Find most popular option
  const maxVotes = Math.max(...votesArray);
  const mostPopularIndex = votesArray.findIndex(votes => votes === maxVotes);
  const mostPopular = poll.options[mostPopularIndex]?.text || "N/A";

  // Format created date
  const createdDate = poll.created_at 
    ? new Date(poll.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  // Determine poll status
  const now = new Date();
  const isExpired = poll.closeAt && new Date(poll.closeAt) < now;
  const status = isExpired ? 'closed' : 'active';

  const exportCSV = () => {
    const rows = [["Option","Votes","Percentage"], 
      ...poll.options.map((o,i) => [
        o.text, 
        votesArray[i] || 0,
        totalVotes > 0 ? `${Math.round(((votesArray[i] || 0) / totalVotes) * 100)}%` : '0%'
      ])
    ];
    const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${poll.title.replace(/\W+/g,"_")}_results.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-muted hover:text-text transition-colors"
        >
          ← Back to polls
        </button>
        <button className="text-muted hover:text-white">
          ⋯
        </button>
      </div>

      {/* Title and Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">
            {poll.title}
          </h1>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            status === 'active' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-500 text-white'
          }`}>
            {status}
          </span>
        </div>
        {poll.description && (
          <p className="text-muted">
            {poll.description}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <BarChartIcon className="h-5 w-5" />
            <span className="text-2xl font-bold">{totalVotes}</span>
          </div>
          <div className="text-sm text-muted">Total Votes</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <UsersIcon className="h-5 w-5" />
            <span className="text-2xl font-bold">{participants}</span>
          </div>
          <div className="text-sm text-muted">Participants</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <CalendarIcon className="h-5 w-5" />
            <span className="text-lg font-bold">{createdDate}</span>
          </div>
          <div className="text-sm text-muted">Created</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-white mb-1">
            <StarIcon className="h-5 w-5 text-yellow-400" />
            <span className="text-lg font-bold">{mostPopular}</span>
          </div>
          <div className="text-sm text-muted">Most Popular</div>
        </div>
      </div>

      {/* Vote Results */}
      <div className="bg-gray-700/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Vote Results</h3>
        
        <div className="space-y-4">
          {poll.options.map((option, index) => {
            const votes = votesArray[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            
            return (
              <div key={option.id || index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">#{index + 1}</span>
                    <span className="text-white font-medium">{option.text}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{percentage}%</div>
                    <div className="text-sm text-muted">{votes} votes</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600">
          <span className="text-muted">Total responses</span>
          <span className="text-white font-bold text-xl">{totalVotes}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onShare}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <ShareIcon className="h-4 w-4" />
          Share Poll
        </button>
        
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          Export Results
        </button>
      </div>
    </div>
  );
}
