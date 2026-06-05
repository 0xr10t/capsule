import * as React from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  selected?: number | null;
  onChange?: (index: number | null) => void;
}

const buttonVariants = {
  initial: { gap: 0, paddingLeft: ".65rem", paddingRight: ".65rem" },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".65rem",
    paddingRight: isSelected ? "1rem" : ".65rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition: Transition = { delay: 0.05, type: "spring", bounce: 0, duration: 0.45 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-teal-200",
  selected,
  onChange,
}: ExpandableTabsProps) {
  const [internalSelected, setInternalSelected] = React.useState<number | null>(selected ?? null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);
  const current = selected ?? internalSelected;

  useOnClickOutside(outsideClickRef, () => {
    setInternalSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number) => {
    setInternalSelected(index);
    onChange?.(index);
  };

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-2xl shadow-black/20 backdrop-blur-xl",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <div className="mx-1 h-6 w-px bg-white/10" key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = current === index;
        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-xl py-2 text-sm font-medium transition-colors duration-300",
              isSelected ? cn("bg-white/10", activeColor) : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
            )}
            type="button"
          >
            <Icon size={18} strokeWidth={1.8} />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
