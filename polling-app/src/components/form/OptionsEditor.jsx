import clsx from "clsx";

export default function OptionsEditor({ options, setOptions, onPaste }) {
  const addOption = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index, value) => {
    setOptions(options.map((opt, i) => i === index ? value : opt));
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const addOtherOption = () => {
    setOptions([...options, "Other"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="label">Answer Options</label>
        <button
          type="button"
          className="link text-sm"
          onClick={onPaste}
        >
          Paste answers
        </button>
      </div>
      
      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="input flex-1"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
            />
            <button
              type="button"
              className={clsx(
                "icon-btn",
                options.length <= 2 && "opacity-40 pointer-events-none"
              )}
              onClick={() => removeOption(index)}
              aria-label={`Remove option ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={addOption}
        >
          + Add option
        </button>
        <button
          type="button"
          className="link text-sm"
          onClick={addOtherOption}
        >
          Add "Other"
        </button>
      </div>
    </div>
  );
}