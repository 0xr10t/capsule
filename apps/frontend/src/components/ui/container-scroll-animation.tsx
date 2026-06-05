import React, { useRef } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.82, 0.96] : [1.03, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -88]);

  return (
    <div className="relative flex h-[52rem] items-center justify-center p-2 md:h-[68rem] md:p-12" ref={containerRef}>
      <div className="relative w-full py-10 md:py-32" style={{ perspective: "1200px" }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <CardFrame rotate={rotate} scale={scale}>
          {children}
        </CardFrame>
      </div>
    </div>
  );
}

function Header({ translate, titleComponent }: { translate: MotionValue<number>; titleComponent: React.ReactNode }) {
  return (
    <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
      {titleComponent}
    </motion.div>
  );
}

function CardFrame({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 12px 28px #00000055, 0 48px 58px #00000040, 0 110px 80px #00000022",
      }}
      className="mx-auto -mt-10 h-[30rem] w-full max-w-6xl rounded-[2rem] border border-white/15 bg-[#17181d] p-2 shadow-2xl md:h-[40rem] md:p-4"
    >
      <div className="h-full w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050609]">
        {children}
      </div>
    </motion.div>
  );
}
