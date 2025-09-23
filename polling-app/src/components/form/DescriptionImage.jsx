import { useRef } from "react";

/**
 * Props:
 *  open, onToggle
 *  desc, onDescChange
 *  image, onImageChange  // stores a Data URL for preview (or empty string)
 */
export default function DescriptionImage({
  open, onToggle,
  desc, onDescChange,
  image, onImageChange
}) {
  const fileInputRef = useRef(null);

  const pickImage = () => fileInputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onImageChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-3">
      {/* Header row: “Description (optional)” + show/hide toggle */}
      <div className="flex items-center justify-between">
        <label className="label">Description <span className="text-[--color-muted] opacity-70">(optional)</span></label>
        <button
          type="button"
          className="link text-sm"
          onClick={onToggle}
        >
          {open ? "Hide description" : "Show description"}
        </button>
      </div>

      {/* Collapsible content */}
      {open && (
        <div className="space-y-3">
          <textarea
            className="textarea"
            value={desc}
            onChange={(e) => onDescChange(e.target.value)}
          />

          {/* Add image row */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
            <button type="button" className="btn btn-primary" onClick={pickImage}>
              <span className="mr-2">🖼️</span> Add image
            </button>

            {image && (
              <>
                <img
                  src={image}
                  alt="preview"
                  className="h-16 w-16 object-cover rounded-xl border border-stroke"
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onImageChange("")}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}