export default function LotusMark() {
  return (
    <svg
      className="lotus-mark"
      viewBox="0 0 128 92"
      role="img"
      aria-label="Lotus"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lotusCenter" x1="64" y1="8" x2="64" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f6ddb0" />
          <stop offset="0.5" stopColor="#d4a14c" />
          <stop offset="1" stopColor="#9a6d2d" />
        </linearGradient>
        <linearGradient id="lotusOuter" x1="18" y1="18" x2="110" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a506d" />
          <stop offset="1" stopColor="#70839a" />
        </linearGradient>
      </defs>
      <path
        d="M64 10C56.4 18.1 52.6 27 52.6 36.7C52.6 47.7 57.1 56.4 64 61.7C70.9 56.4 75.4 47.7 75.4 36.7C75.4 27 71.6 18.1 64 10Z"
        className="lotus-mark-core"
      />
      <path
        d="M43 19.4C28.7 23.8 17.4 32.8 12.9 45.3C8 58.8 18.8 68.2 34.5 66.7C30.6 61.6 28.8 55.8 28.8 49.5C28.8 38.7 33.1 28.9 43 19.4Z"
        className="lotus-mark-petal-left"
      />
      <path
        d="M85 19.4C99.3 23.8 110.6 32.8 115.1 45.3C120 58.8 109.2 68.2 93.5 66.7C97.4 61.6 99.2 55.8 99.2 49.5C99.2 38.7 94.9 28.9 85 19.4Z"
        className="lotus-mark-petal-right"
      />
      <path
        d="M29.8 33.8C20.5 35.2 12.6 40.4 9 48C4.6 57.1 11.8 65.1 24.1 66.5C21.5 62.7 20.3 58.4 20.3 53.7C20.3 46.6 23.1 40.3 29.8 33.8Z"
        className="lotus-mark-petal-outer"
      />
      <path
        d="M98.2 33.8C107.5 35.2 115.4 40.4 119 48C123.4 57.1 116.2 65.1 103.9 66.5C106.5 62.7 107.7 58.4 107.7 53.7C107.7 46.6 104.9 40.3 98.2 33.8Z"
        className="lotus-mark-petal-outer"
      />
      <path
        d="M40.7 72.8C46.1 78.1 53.5 81 64 81C74.5 81 81.9 78.1 87.3 72.8C80.8 74.8 73.1 75.8 64 75.8C54.9 75.8 47.2 74.8 40.7 72.8Z"
        className="lotus-mark-base"
      />
      <path
        d="M23 67.6C34.1 69.9 47.8 71.2 64 71.2C80.2 71.2 93.9 69.9 105 67.6"
        className="lotus-mark-line"
      />
      <path
        d="M64 10C56.4 18.1 52.6 27 52.6 36.7C52.6 47.7 57.1 56.4 64 61.7C70.9 56.4 75.4 47.7 75.4 36.7C75.4 27 71.6 18.1 64 10Z"
        className="lotus-mark-stroke"
      />
      <path
        d="M43 19.4C28.7 23.8 17.4 32.8 12.9 45.3C8 58.8 18.8 68.2 34.5 66.7C30.6 61.6 28.8 55.8 28.8 49.5C28.8 38.7 33.1 28.9 43 19.4Z"
        className="lotus-mark-stroke"
      />
      <path
        d="M85 19.4C99.3 23.8 110.6 32.8 115.1 45.3C120 58.8 109.2 68.2 93.5 66.7C97.4 61.6 99.2 55.8 99.2 49.5C99.2 38.7 94.9 28.9 85 19.4Z"
        className="lotus-mark-stroke"
      />
      <path
        d="M29.8 33.8C20.5 35.2 12.6 40.4 9 48C4.6 57.1 11.8 65.1 24.1 66.5C21.5 62.7 20.3 58.4 20.3 53.7C20.3 46.6 23.1 40.3 29.8 33.8Z"
        className="lotus-mark-stroke-soft"
      />
      <path
        d="M98.2 33.8C107.5 35.2 115.4 40.4 119 48C123.4 57.1 116.2 65.1 103.9 66.5C106.5 62.7 107.7 58.4 107.7 53.7C107.7 46.6 104.9 40.3 98.2 33.8Z"
        className="lotus-mark-stroke-soft"
      />
    </svg>
  );
}
