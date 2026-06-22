export default function HeaderRight() {
  return (
    <div className="pointer-events-auto flex basis-1/3 items-center justify-end gap-2">
      <a
        href="/paper.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="flex cursor-pointer items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow-none transition-colors hover:bg-red-600"
      >
        Ver paper
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      </a>
    </div>
  );
}
