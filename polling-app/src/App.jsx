import { useEffect, useState } from "react";
import CreatePollForm from "./components/CreatePollForm.jsx";
import PollCard from "./components/PollCard.jsx";
import PollList from "./components/PollList.jsx";
import PollCreatedSuccess from "./components/PollCreatedSuccess.jsx";
import ShareModal from "./components/ShareModal.jsx";
import AuthPage from "./auth/AuthPage.jsx";
import { myPolls, createPoll } from "./api.js";
import PollResults from "./components/PollResults.jsx";

export default function App() {
  const [auth, setAuth] = useState(null);
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
  }, []);

  // Load polls from remote only
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
          console.log("Setting polls:", res.polls);
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
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_login_time");
    setAuth(null);
    setPolls([]);
    setActiveId(null);
    setShowSuccess(false);
  };

  if (!auth) return <AuthPage onSignedIn={handleSignIn} />;

  const activePoll = polls.find(p => p.id === activeId) || null;

  const addPoll = async (pollData) => {
    setError("");
    setLoading(true);
    
    try {
      console.log("Creating poll with data:", pollData);
      
      const res = await createPoll(auth.token, pollData);
      console.log("API response:", res);
      
      if (res?.ok) {
        // Success case - poll was created
        if (res.poll) {
          // Response includes the poll data
          const newPoll = res.poll;
          setPolls(prev => [...prev, newPoll]);
          setActiveId(newPoll.id);
          setShowSuccess(true);
          setIsNewlyCreated(true);
          console.log("Poll created successfully with data:", newPoll);
        } else {
          // Poll was created but no poll data returned - reload polls
          console.log("Poll created successfully, reloading polls...");
          const pollsRes = await myPolls(auth.token);
          if (pollsRes?.ok) {
            setPolls(pollsRes.polls || []);
            // Find the most recently created poll (highest created_at)
            const latestPoll = (pollsRes.polls || []).reduce((latest, poll) => 
              (!latest || poll.created_at > latest.created_at) ? poll : latest, null);
            if (latestPoll) {
              setActiveId(latestPoll.id);
              setShowSuccess(true);
              setIsNewlyCreated(true);
            }
          }
        }
      } else {
        // Check if poll might have been created despite error response
        console.log("API returned error, but checking if poll was created...");
        const pollsRes = await myPolls(auth.token);
        if (pollsRes?.ok) {
          const currentPollCount = polls.length;
          const newPollCount = (pollsRes.polls || []).length;
          
          if (newPollCount > currentPollCount) {
            // A new poll was created despite the error
            console.log("Poll was actually created despite error response");
            setPolls(pollsRes.polls || []);
            const latestPoll = (pollsRes.polls || []).reduce((latest, poll) => 
              (!latest || poll.created_at > latest.created_at) ? poll : latest, null);
            if (latestPoll) {
              setActiveId(latestPoll.id);
              setShowSuccess(true);
              setIsNewlyCreated(true);
            }
          } else {
            // Poll was not created
            const errorMsg = res?.error || "Failed to create poll";
            setError(`Error: ${errorMsg}`);
            console.error("Poll creation failed:", errorMsg);
          }
        } else {
          // Can't verify, show error
          const errorMsg = res?.error || "Failed to create poll";
          setError(`Error: ${errorMsg}`);
          console.error("Poll creation failed:", errorMsg);
        }
      }
    } catch (error) {
      console.error("Failed to create poll:", error);
      
      // Even on network error, check if poll was created
      try {
        const pollsRes = await myPolls(auth.token);
        if (pollsRes?.ok) {
          const currentPollCount = polls.length;
          const newPollCount = (pollsRes.polls || []).length;
          
          if (newPollCount > currentPollCount) {
            console.log("Poll was created despite network error");
            setPolls(pollsRes.polls || []);
            const latestPoll = (pollsRes.polls || []).reduce((latest, poll) => 
              (!latest || poll.created_at > latest.created_at) ? poll : latest, null);
            if (latestPoll) {
              setActiveId(latestPoll.id);
              setShowSuccess(true);
              setIsNewlyCreated(true);
              return; // Exit early, don't show error
            }
          }
        }
      } catch (checkError) {
        console.error("Failed to verify poll creation:", checkError);
      }
      
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePoll = (updatedPoll) => {
    setPolls(polls.map(p => p.id === updatedPoll.id ? updatedPoll : p));
  };

  const deletePollLocal = (pollId) => {
    setPolls(polls.filter(p => p.id !== pollId));
    setActiveId(null);
    setShowSuccess(false);
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
