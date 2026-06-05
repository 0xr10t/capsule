import { lazy, Suspense, useEffect, useState } from "react";
import { cn } from "../../lib/utils";

const UnicornScene = lazy(() => import("unicornstudio-react"));

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export function RaycastAnimatedBackground({ className }: { className?: string }) {
  const { width, height } = useWindowSize();

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden opacity-30", className)} aria-hidden="true">
      <Suspense fallback={<div className="h-full w-full bg-[radial-gradient(circle_at_50%_30%,rgba(94,234,212,0.18),transparent_28rem)]" />}>
        <UnicornScene production projectId="cbmTT38A0CcuYxeiyj5H" width={width} height={height} />
      </Suspense>
    </div>
  );
}
