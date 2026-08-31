/**
 * The course mark: a bold green checkmark inside a rounded frame — the
 * universal "test passed" motif. The green (#16A34A) is the pass colour and the
 * teal frame (#0D9488) is the verification accent, matching the course palette.
 * Callers control size via `className`; the brand colours are fixed so the mark
 * looks consistent in both light and dark themes.
 */
export function TestingLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
    >
      {/* rounded frame — the test case / suite */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="#0D9488"
        strokeWidth="1.6"
        opacity="0.45"
      />
      {/* the pass checkmark */}
      <path
        d="M7.5 12.4l3.1 3.1L16.7 9"
        stroke="#16A34A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
