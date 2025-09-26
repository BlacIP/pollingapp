import { useMemo, useState } from "react";
import ResultsChart from "./ResultsChart.jsx";

export default function PollCard({ poll, onUpdate, onDelete, onBack, onShare }) {
  const [showResults, setShowResults] = useState(false);
  const [name, setName] = useState("");

  const inputType = poll.type === "multiple" ? "checkbox" : "radio";
  const securityNote = useMemo(() => ({
    none: "Multiple votes allowed.",
    session: "One vote per browser session allowed.",
    device: "One vote per device allowed.",
    code: "One vote per unique code."
  }[poll.security] || ""), [poll.security]);

  // Convert votes object to array if needed
  const votesArray = useMemo(() => {
    if (Array.isArray(poll.votes)) {
      return poll.votes;
    } else if (poll.votes && typeof poll.votes === 'object') {
      // Convert object to array based on option indices
      return poll.options.map((_, index) => poll.votes[index] || 0);
    } else {
      // Initialize with zeros
      return poll.options.map(() => 0);
    }
  }, [poll.votes, poll.options]);

  const submitVote = (e) => {
    e.preventDefault();

    if (poll.requireName && !name.trim()) return alert("Please enter your name.");
    const selected = [...e.currentTarget.querySelectorAll("input[name=vote]:checked")].map(i=>+i.value);
    if (selected.length === 0) return alert("Select an option.");
    if (poll.type === "single" && selected.length > 1) return alert("Select only one option.");

    const scope = poll.security === "session"
      ? "session"
      : poll.security === "device"
        ? "device"
        : "none";
    const pollId = poll.id; // Use 'id' not 'poll_id'
    const key = `voted_${scope}_${pollId}`;

    if (scope === "session" && sessionStorage.getItem(key)) {
      return alert("You already voted in this browser session.");
    }
    if (scope === "device") {
      try {
        if (localStorage.getItem(key)) {
          return alert("You already voted on this device.");
        }
      } catch (storageError) {
        console.error("Device vote check failed", storageError);
      }
    }

    // Update votes locally for immediate UI feedback
    const newVotes = votesArray.map((count, i) => 
      selected.includes(i) ? count + 1 : count
    );

    const updatedPoll = {
      ...poll,
      votes: newVotes
    };

    onUpdate(updatedPoll);

    if (scope === "session") sessionStorage.setItem(key, "1");
    if (scope === "device") {
      try {
        localStorage.setItem(key, "1");
      } catch (storageError) {
        console.error("Failed to persist device vote", storageError);
      }
    }
    alert("Vote successful");
  };

  const reset = () => {
    if (!confirm("Reset all votes to 0?")) return;
    const resetPoll = { ...poll, votes: poll.options.map(()=>0) };
    onUpdate(resetPoll);
  };

  const exportCSV = () => {
    const rows = [["Option","Votes"], ...poll.options.map((o,i)=>[o.text, votesArray[i] || 0])];
    const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${poll.title.replace(/\W+/g,"_")}.csv`;
    a.click();
  };

  // Create poll object with array votes for chart
  const pollForChart = {
    ...poll,
    votes: votesArray
  };

  return (
    <div>
      <div className="flex items-start gap-2 relative">
        <h2 className="text-2xl flex-1">{poll.title}</h2>
        <div className="relative">
          <button className="icon-btn" onClick={(e)=>e.currentTarget.nextSibling.classList.toggle("hidden")}>⋯</button>
          <ul className="absolute right-0 top-9 bg-[#0c1120] border border-stroke rounded-xl2 p-2 min-w-[160px] hidden z-10">
            <li className="px-2 py-1 cursor-pointer hover:bg-[#111831]" onClick={reset}>Reset votes</li>
            <li className="px-2 py-1 cursor-pointer hover:bg-[#111831]" onClick={exportCSV}>Export CSV</li>
            <li className="px-2 py-1 cursor-pointer hover:bg-[#111831] text-red-400" onClick={()=>onDelete(poll.id)}>Delete poll</li>
          </ul>
        </div>
      </div>

      {poll.description && <p className="text-muted mt-1">{poll.description}</p>}
      {poll.image && <img src={poll.image} alt="" className="w-full rounded-xl2 border border-stroke my-2" />}

      {!showResults ? (
        <form onSubmit={submitVote} className="mt-3">
          <div className="space-y-2">
            {poll.options.map((o,i)=>(
              <label key={o.id || i} className="flex items-center gap-3">
                <input type={inputType} name="vote" value={i} className="accent-primary" />
                <span>{o.text}</span>
              </label>
            ))}
          </div>

          {poll.requireName && (
            <div className="mt-3">
              <input className="input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" type="submit">Vote</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowResults(true)}>Show results</button>
            <button type="button" className="btn btn-ghost" onClick={onShare}>Share</button>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>
          </div>

          <p className="text-muted text-sm mt-3">{securityNote}</p>
        </form>
      ) : (
        <div className="mt-4">
          <ResultsChart poll={pollForChart} />
          <div className="flex gap-2 mt-4">
            <button className="btn btn-ghost" onClick={()=>setShowResults(false)}>Back to voting</button>
            <button className="btn btn-ghost" onClick={onShare}>Share</button>
            <button className="btn btn-ghost" onClick={onBack}>Back to polls</button>
          </div>
        </div>
      )}
    </div>
  );
}
