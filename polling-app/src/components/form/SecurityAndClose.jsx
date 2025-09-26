export default function SecurityAndClose({
  allowMulti, setAllowMulti,
  requireName, setRequireName,
  security, setSecurity,
  enableClose, setEnableClose,
  closeAt, setCloseAt
}) {
  const securityNotes = {
    none: "Participants can vote multiple times. Limited to 1,000 votes per poll.",
    device: "Tracks device votes in localStorage so the same device cannot vote twice.",
    session: "Uses sessionStorage to prevent repeat votes until the browser is closed."
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Settings</h3>
      
      <div className="space-y-4">
        {/* Allow Multiple Options */}
        <div className="flex items-center justify-between">
          <label className="label">Allow selection of multiple options</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={allowMulti}
              onChange={(e) => setAllowMulti(e.target.checked)}
            />
            <span></span>
          </label>
        </div>

        {/* Require Names */}
        <div className="flex items-center justify-between">
          <label className="label">Require participant names</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={requireName}
              onChange={(e) => setRequireName(e.target.checked)}
            />
            <span></span>
          </label>
        </div>

        {/* Voting Security */}
        <div className="space-y-2">
          <label className="label">Voting security</label>
          <div className="select">
            <select
              value={security}
              onChange={(e) => setSecurity(e.target.value)}
            >
              <option value="session">One vote per browser session</option>
              <option value="device">One vote per device</option>
              <option value="none">No restrictions (multiple votes allowed)</option>
            </select>
          </div>
          {securityNotes[security] && (
            <p className="text-red-400 text-sm">
              {securityNotes[security]}
            </p>
          )}
        </div>

        {/* Close Time */}
        <div className="flex items-center justify-between">
          <label className="label">Set close time</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={enableClose}
              onChange={(e) => setEnableClose(e.target.checked)}
            />
            <span></span>
          </label>
        </div>

        {enableClose && (
          <div className="space-y-2">
            <label className="label text-sm text-muted">Close at</label>
            <input
              type="datetime-local"
              className="input"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
