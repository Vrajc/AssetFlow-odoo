/**
 * Hand-drawn accent kit (Odoo-inspired). Purely decorative SVG components —
 * reuse across the landing page and sparingly inside the app.
 */

/** Marker-style yellow highlight behind a word/phrase. */
export function MarkerHighlight({ children, color = '#FBB945' }: { children: React.ReactNode; color?: string }) {
  // `isolate` keeps the -z-10 stroke within this stacking context (behind the
  // text but above the page background — never slips out of view).
  return (
    <span className="relative isolate inline-block">
      <svg className="absolute inset-x-[-4%] bottom-[6%] -z-10 h-[62%] w-[108%]" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden>
        <path d="M4 20 C 40 8, 160 8, 196 18 C 198 26, 190 34, 150 35 C 90 37, 20 36, 6 30 C 2 26, 2 22, 4 20 Z" fill={color} opacity="0.75" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

/** Hand-drawn scribble circle/ellipse around a word (Odoo-style). */
export function CircleScribble({ children, color = '#21B799' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="relative isolate inline-block px-2">
      <svg className="absolute inset-x-[-8%] inset-y-[-30%] -z-10 h-[160%] w-[116%]" viewBox="0 0 200 90" preserveAspectRatio="none" aria-hidden>
        <path d="M100 6 C 40 6, 8 26, 10 46 C 12 70, 70 84, 120 82 C 175 80, 196 58, 190 40 C 184 20, 150 8, 96 8" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

/** Small speech-bubble badge with a Caveat word inside. */
export function SpeechBubble({ text, color = '#714B67', className = '' }: { text: string; color?: string; className?: string }) {
  return (
    <span className={`relative inline-flex items-center rounded-2xl rounded-bl-none border-2 bg-surface px-3 py-1 font-script text-lg font-semibold ${className}`} style={{ borderColor: color, color }}>
      {text}
    </span>
  );
}

/** Wavy hand-drawn underline under a word. */
export function Underline({ color = '#5B9BD5', className = '' }: { color?: string; className?: string }) {
  return (
    <svg className={`absolute left-0 right-0 -bottom-2 h-3 w-full ${className}`} viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
      <path d="M2 7 C 40 2, 70 11, 100 6 C 130 1, 165 10, 198 5" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Word wrapped with a wavy underline. */
export function Wavy({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="relative inline-block">
      {children}
      <Underline color={color} />
    </span>
  );
}

/**
 * Curved hand-drawn arrow that points DOWN (tail top-right, head bottom-left).
 * `flip` mirrors horizontally so the tail is top-left instead.
 */
export function Arrow({ color = '#714B67', className = '', width = 46, height = 40, flip = false }: { color?: string; className?: string; width?: number; height?: number; flip?: boolean }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 60 52" fill="none" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <path d="M54 6 C 26 2, 8 16, 12 44" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M4 34 L 12 46 L 22 38" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Small Caveat side-note, optionally paired with an arrow. */
export function Annotation({ text, color = '#714B67', className = '' }: { text: string; color?: string; className?: string }) {
  return (
    <span className={`inline-block whitespace-nowrap font-script text-xl font-semibold leading-none ${className}`} style={{ color }}>{text}</span>
  );
}

/** Little 3-line sparkle burst. */
export function Sparkle({ color = '#FBB945', className = '', size = 22 }: { color?: string; className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M12 3 L12 9" />
        <path d="M12 15 L12 21" />
        <path d="M3 12 L9 12" />
        <path d="M15 12 L21 12" />
        <path d="M6 6 L8.5 8.5" />
        <path d="M15.5 15.5 L18 18" />
        <path d="M18 6 L15.5 8.5" />
        <path d="M8.5 15.5 L6 18" />
      </g>
    </svg>
  );
}
