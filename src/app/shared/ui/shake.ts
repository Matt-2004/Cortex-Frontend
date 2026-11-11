/**
 * 1-second horizontal "wrong input" shake, using the Web Animations API so it
 * can be re-triggered on every failed submit without toggling CSS classes.
 * Skipped entirely for users who prefer reduced motion (the red border and
 * error message still show).
 */
export const SHAKE_DURATION_MS = 1000;

const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-8px)", offset: 0.1 },
  { transform: "translateX(8px)", offset: 0.2 },
  { transform: "translateX(-7px)", offset: 0.3 },
  { transform: "translateX(7px)", offset: 0.4 },
  { transform: "translateX(-5px)", offset: 0.5 },
  { transform: "translateX(5px)", offset: 0.6 },
  { transform: "translateX(-3px)", offset: 0.7 },
  { transform: "translateX(3px)", offset: 0.8 },
  { transform: "translateX(-1px)", offset: 0.9 },
  { transform: "translateX(0)" },
];

const runningShakes = new WeakMap<Element, Animation>();

export function shakeElement(el: Element | null | undefined) {
  if (!el || typeof window === "undefined" || !("animate" in el)) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  // Restart cleanly if it's already shaking.
  runningShakes.get(el)?.cancel();
  const animation = el.animate(SHAKE_KEYFRAMES, {
    duration: SHAKE_DURATION_MS,
    easing: "ease-in-out",
  });
  runningShakes.set(el, animation);
  animation.onfinish = () => runningShakes.delete(el);
}
