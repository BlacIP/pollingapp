import { QRCodeCanvas } from "qrcode.react";

export default function ShareModal({ poll, onClose }) {
  const url = `${location.origin}${location.pathname}#${poll.id}`;
  const copy = async () => { 
    try { 
      await navigator.clipboard.writeText(url); 
    } catch (err) { 
      // Optionally handle error, e.g., show a message or log
      console.error("Failed to copy to clipboard", err);
    } 
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl">
        <div className="flex items-center justify-between border-b border-stroke p-3">
          <h3 className="text-xl">Share</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="label">Share via link</label>
            <div className="flex gap-2">
              <input className="input flex-1" value={url} readOnly />
              <button className="btn" onClick={copy}>Copy</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank">WhatsApp</a>
            <a className="btn" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`} target="_blank">Twitter</a>
            <a className="btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank">Facebook</a>
            <div className="col-span-3 flex items-center justify-center bg-[#0c1120] border border-stroke rounded-xl2 py-3">
              <QRCodeCanvas value={url} size={120} bgColor="#0c1120" fgColor="#e8ecf4" />
            </div>
          </div>
        </div>

        <div className="border-t border-stroke p-3 flex justify-end">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}