export default function LotusMark() {
  return (
    <svg
      className="lotus-mark"
      viewBox="0 0 160 104"
      role="img"
      aria-label="Lotus"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="lotusPetalGradient"
          x1="22"
          y1="16"
          x2="132"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f26d72" />
          <stop offset="0.52" stopColor="#e54148" />
          <stop offset="1" stopColor="#cb1f29" />
        </linearGradient>
        <linearGradient
          id="lotusPetalGradientSoft"
          x1="34"
          y1="18"
          x2="124"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f7b2b6" />
          <stop offset="1" stopColor="#df4f57" />
        </linearGradient>
      </defs>

      <path
        d="M80 8C70.5 16.8 65.8 27.5 65.8 39.2C65.8 52.8 71.1 63.5 80 70.8C88.9 63.5 94.2 52.8 94.2 39.2C94.2 27.5 89.5 16.8 80 8Z"
        className="lotus-mark-center"
      />
      <path
        d="M53.6 15.4C42.6 22.8 35.6 32.8 33.4 44.5C30.8 58.5 38.1 69 49.8 74.1C49 70.8 48.6 67.4 48.6 63.9C48.6 45.8 58.3 29.6 53.6 15.4Z"
        className="lotus-mark-mid"
      />
      <path
        d="M106.4 15.4C117.4 22.8 124.4 32.8 126.6 44.5C129.2 58.5 121.9 69 110.2 74.1C111 70.8 111.4 67.4 111.4 63.9C111.4 45.8 101.7 29.6 106.4 15.4Z"
        className="lotus-mark-mid"
      />
      <path
        d="M30.9 33.9C20.4 38.5 12.8 45.9 9.7 55.1C6.1 65.7 11.9 74.8 23.2 79.7C28.9 82.2 36.1 83.7 44.3 83.4C34.8 75.7 29.1 65.9 30.9 33.9Z"
        className="lotus-mark-wide"
      />
      <path
        d="M129.1 33.9C139.6 38.5 147.2 45.9 150.3 55.1C153.9 65.7 148.1 74.8 136.8 79.7C131.1 82.2 123.9 83.7 115.7 83.4C125.2 75.7 130.9 65.9 129.1 33.9Z"
        className="lotus-mark-wide"
      />
      <path
        d="M15.2 57C8.5 59.9 3.8 64.8 1.9 70.9C-0.2 77.7 3.5 83.7 11.1 87C16.1 89.1 22.4 90.1 29.4 89.4C23 84.7 18.1 79 15.2 57Z"
        className="lotus-mark-wing"
      />
      <path
        d="M144.8 57C151.5 59.9 156.2 64.8 158.1 70.9C160.2 77.7 156.5 83.7 148.9 87C143.9 89.1 137.6 90.1 130.6 89.4C137 84.7 141.9 79 144.8 57Z"
        className="lotus-mark-wing"
      />
      <path
        d="M47.6 73.6C55.6 82.8 66.1 88.4 80 88.4C93.9 88.4 104.4 82.8 112.4 73.6C103 77.1 92.2 79 80 79C67.8 79 57 77.1 47.6 73.6Z"
        className="lotus-mark-base"
      />
    </svg>
  );
}
