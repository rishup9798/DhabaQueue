"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DOCK_HEIGHT = 128;
const DEFAULT_MAGNIFICATION = 80;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_HEIGHT = 64;

const DockContext = createContext(null);

function Dock({
  children,
  className = "",
  spring = {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => {
    return Math.max(
      DOCK_HEIGHT,
      magnification + magnification / 2 + 4
    );
  }, [magnification]);

  const heightRow = useTransform(
    isHovered,
    [0, 1],
    [panelHeight, maxHeight]
  );

  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={{
        height,
        scrollbarWidth: "none",
      }}
      className="mx-2 flex max-w-full items-end overflow-x-auto"
    >
      <motion.div
        onMouseMove={(event) => {
          isHovered.set(1);
          mouseX.set(event.pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`mx-auto flex w-fit gap-3 rounded-2xl border border-white/10 bg-black/80 px-4 py-2 shadow-2xl backdrop-blur-xl ${className}`}
        style={{
          height: panelHeight,
        }}
        role="toolbar"
        aria-label="Application dock"
      >
        <DockContext.Provider
          value={{
            mouseX,
            spring,
            distance,
            magnification,
          }}
        >
          {children}
        </DockContext.Provider>
      </motion.div>
    </motion.div>
  );
}

function useDock() {
  const context = useContext(DockContext);

  if (!context) {
    throw new Error("DockItem must be used inside Dock");
  }

  return context;
}

function DockItem({
  children,
  className = "",
}) {
  const ref = useRef(null);

  const {
    distance,
    magnification,
    mouseX,
    spring,
  } = useDock();

  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(
    mouseX,
    (value) => {
      const rect =
        ref.current?.getBoundingClientRect();

      if (!rect) return Infinity;

      return (
        value -
        rect.x -
        rect.width / 2
      );
    }
  );

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const width = useSpring(
    widthTransform,
    spring
  );

  return (
    <motion.div
      ref={ref}
      style={{
        width,
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      className={`relative inline-flex items-center justify-center ${className}`}
      tabIndex={0}
    >
      {Children.map(children, (child) => {
        if (!child) return null;

        return cloneElement(child, {
          width,
          isHovered,
        });
      })}
    </motion.div>
  );
}

function DockLabel({
  children,
  className = "",
  isHovered,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;

    const unsubscribe = isHovered.on(
      "change",
      (value) => {
        setVisible(value === 1);
      }
    );

    return unsubscribe;
  }, [isHovered]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{
            opacity: 0,
            y: 0,
          }}
          animate={{
            opacity: 1,
            y: -10,
          }}
          exit={{
            opacity: 0,
            y: 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className={`absolute -top-6 left-1/2 w-fit -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black px-2 py-1 text-xs text-white shadow-lg ${className}`}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({
  children,
  className = "",
  width,
}) {
  const widthTransform = useTransform(
    width,
    (value) => value / 2
  );

  return (
    <motion.div
      style={{
        width: widthTransform,
      }}
      className={`flex items-center justify-center ${className}`}
    >
      {children}
    </motion.div>
  );
}

export {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
};