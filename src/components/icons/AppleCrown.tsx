import type { SVGProps } from "react";

type AppleCrownProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export const AppleCrown = ({ size = 17, style, ...props }: AppleCrownProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        opacity: 0.95,
        display: "inline-block",
        verticalAlign: "baseline",
        ...style,
      }}
      {...props}
    >
      <defs>
        <linearGradient id="apple-crown-gradient" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgba(255,255,255,0.98)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.82)" />
        </linearGradient>
      </defs>
      <path
        d="M4.2 17.4H19.8L18.6 9.1L14.35 11.95L12 6.7L9.65 11.95L5.4 9.1L4.2 17.4Z"
        fill="url(#apple-crown-gradient)"
      />
      <path
        d="M4.2 17.4H19.8M7 19.6H17"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <circle cx="12" cy="6.7" r="0.8" fill="rgba(255,255,255,0.95)" />
    </svg>
  );
};
