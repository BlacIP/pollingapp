import { useState } from "react";
import { uid } from "../utils/id.js";
import TitleField from "./form/TitleField.jsx";
import DescriptionImage from "./form/DescriptionImage.jsx";
import OptionsEditor from "./form/OptionsEditor.jsx";
import SecurityAndClose from "./form/SecurityAndClose.jsx";

export default function CreatePollForm({ onCreate, loading }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [options, setOptions] = useState(["", ""]);

  // Settings
  const [allowMulti, setAllowMulti] = useState(false);
  const [requireName, setRequireName] = useState(false);
  const [security, setSecurity] = useState("session");
  const [enableClose, setEnableClose] = useState(false);
  const [closeAt, setCloseAt] = useState("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (lines.length) {
        setOptions(prev => [...prev.filter(Boolean), ...lines]);
      }
    } catch {
      alert("Paste failed. Copy your answers and try again.");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const clean = options.map(o => o.trim()).filter(Boolean);
    
    if (!title.trim()) {
      alert("Please enter a poll title");
      return;
    }
    if (clean.length < 2) {
      alert("Please provide at least 2 answer options");
      return;
    }

    const poll = {
      id: uid(),
      title: title.trim(),
      description: desc.trim(),
      image,
      type: allowMulti ? "multiple" : "single",
      requireName,
      security,
      closeAt: enableClose ? closeAt : null,
      options: clean.map(t => ({ id: uid(), text: t })),
      votes: clean.map(() => 0),
    };
    onCreate(poll);
  };

  return (
    
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Create a Poll</h1>
        <p className="text-muted">Complete the fields below to create your poll.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <TitleField title={title} onChange={setTitle} />

        <DescriptionImage
          open={showDesc}
          onToggle={() => setShowDesc(v => !v)}
          desc={desc}
          onDescChange={setDesc}
          image={image}
          onImageChange={setImage}
        />

        <OptionsEditor 
          options={options} 
          setOptions={setOptions} 
          onPaste={handlePaste} 
        />

        <SecurityAndClose
          allowMulti={allowMulti} setAllowMulti={setAllowMulti}
          requireName={requireName} setRequireName={setRequireName}
          security={security} setSecurity={setSecurity}
          enableClose={enableClose} setEnableClose={setEnableClose}
          closeAt={closeAt} setCloseAt={setCloseAt}
        />

        <div className="flex justify-end pt-4">
          <button 
            className="btn btn-primary px-8" 
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create poll"}
          </button>
        </div>
      </form>
    </div>
  );
}
