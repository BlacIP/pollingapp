export default function TitleField({ title, onChange }) {
  return (
    <div className="space-y-2">
      <label htmlFor="poll-title" className="label">Title</label>
      <input
        id="poll-title"
        className="input"
        placeholder="Type your question here"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}