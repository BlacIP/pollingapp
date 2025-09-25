import React from "react";

function createIcon(path) {
  return React.forwardRef(function Icon({ size = 24, className = "", ...props }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        width={size}
        height={size}
        {...props}
      >
        {path}
      </svg>
    );
  });
}

export const CheckIcon = createIcon(<path d="M5 12l5 5L20 7" />);

export const ClipboardIcon = createIcon(
  <>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M9 2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
  </>
);

export const ShareIcon = createIcon(
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98" />
    <path d="M15.41 6.51l-6.82 3.98" />
  </>
);

export const EyeIcon = createIcon(
  <>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

export const BarChartIcon = createIcon(
  <>
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </>
);

export const UsersIcon = createIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);

export const CalendarIcon = createIcon(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </>
);

export const StarIcon = createIcon(
  <polygon points="12 2 15 8.5 22 9.3 17 14 18.5 21 12 17.8 5.5 21 7 14 2 9.3 9 8.5 12 2" />
);

export const DownloadIcon = createIcon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </>
);

export const CheckCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </>
);

export const PauseIcon = createIcon(
  <>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </>
);

export const ArchiveIcon = createIcon(
  <>
    <path d="M3 4h18v4H3z" />
    <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </>
);

export const TrashIcon = createIcon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>
);

export const RotateCcwIcon = createIcon(
  <>
    <path d="M3 2v6h6" />
    <path d="M3.51 9a9 9 0 1 0 .49-4" />
  </>
);

export const SkullIcon = createIcon(
  <>
    <path d="M12 2a8 8 0 0 0-8 8c0 2.5 1.1 4.7 3 6.2V20l5 2 5-2v-3.8c1.9-1.5 3-3.7 3-6.2a8 8 0 0 0-8-8z" />
    <circle cx="9" cy="10" r="1.5" />
    <circle cx="15" cy="10" r="1.5" />
    <path d="M10 14h4" />
  </>
);

export const ImagePlusIcon = createIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
    <path d="M16 8h5" />
    <path d="M18.5 5.5v5" />
  </>
);
