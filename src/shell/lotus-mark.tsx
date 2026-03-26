export default function LotusMark() {
  return (
    <svg
      className="lotus-mark"
      viewBox="0 0 124 84"
      role="img"
      aria-label="Lotus"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lotusGlow" x1="18" y1="12" x2="102" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f5e6bd" />
          <stop offset="0.45" stopColor="#d9ab53" />
          <stop offset="1" stopColor="#8c6732" />
        </linearGradient>
        <linearGradient id="lotusPetal" x1="20" y1="16" x2="104" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#31465f" />
          <stop offset="1" stopColor="#6f8096" />
        </linearGradient>
      </defs>
      <path
        d="M62 11.5C56.1 19.1 53.2 26 53.2 33.6C53.2 43.2 57.2 50.6 62 54.6C66.8 50.6 70.8 43.2 70.8 33.6C70.8 26 67.9 19.1 62 11.5Z"
        className="lotus-mark-core"
      />
      <path
        d="M44 22C31 25.8 20.8 33.5 16.6 44.1C11.9 56.1 21.1 63.8 34.6 62.7C31.3 58.1 29.8 53.2 29.8 47.8C29.8 38.3 33.4 29.9 44 22Z"
        className="lotus-mark-petal-left"
      />
      <path
        d="M80 22C93 25.8 103.2 33.5 107.4 44.1C112.1 56.1 102.9 63.8 89.4 62.7C92.7 58.1 94.2 53.2 94.2 47.8C94.2 38.3 90.6 29.9 80 22Z"
        className="lotus-mark-petal-right"
      />
      <path
        d="M28.2 41.4C19.4 42.4 12.2 47.3 9 54C5.5 62.3 11.9 69.3 22.7 70.4C20.6 66.7 19.7 62.6 19.7 58.3C19.7 51.8 22.1 46 28.2 41.4Z"
        className="lotus-mark-petal-outer"
      />
      <path
        d="M95.8 41.4C104.6 42.4 111.8 47.3 115 54C118.5 62.3 112.1 69.3 101.3 70.4C103.4 66.7 104.3 62.6 104.3 58.3C104.3 51.8 101.9 46 95.8 41.4Z"
        className="lotus-mark-petal-outer"
      />
      <path
        d="M41.4 67.8C46.7 72.1 53.6 74.5 62 74.5C70.4 74.5 77.3 72.1 82.6 67.8C77.4 69.2 70.5 70 62 70C53.5 70 46.6 69.2 41.4 67.8Z"
        className="lotus-mark-base"
      />
      <path
        d="M62 11.5C56.1 19.1 53.2 26 53.2 33.6C53.2 43.2 57.2 50.6 62 54.6C66.8 50.6 70.8 43.2 70.8 33.6C70.8 26 67.9 19.1 62 11.5Z"
        className="lotus-mark-stroke"
      />
      <path
        d="M44 22C31 25.8 20.8 33.5 16.6 44.1C11.9 56.1 21.1 63.8 34.6 62.7C31.3 58.1 29.8 53.2 29.8 47.8C29.8 38.3 33.4 29.9 44 22Z"
        className="lotus-mark-stroke"
      />
      <path
        d="M80 22C93 25.8 103.2 33.5 107.4 44.1C112.1 56.1 102.9 63.8 89.4 62.7C92.7 58.1 94.2 53.2 94.2 47.8C94.2 38.3 90.6 29.9 80 22Z"
        className="lotus-mark-stroke"
      />
    </svg>
  );
}
