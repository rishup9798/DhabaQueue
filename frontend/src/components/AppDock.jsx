import {
  Home,
  LayoutDashboard,
  ListOrdered,
  Utensils,
  Info,
} from "lucide-react";

import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from "./ui/dock.jsx";

const items = [
  {
    title: "Home",
    icon: <Home />,
    href: "/",
  },
  {
    title: "Dashboard",
    icon: <LayoutDashboard />,
    href: "/dashboard",
  },
  {
    title: "Queue",
    icon: <ListOrdered />,
    href: "/dashboard",
  },
  {
    title: "Food",
    icon: <Utensils />,
    href: "/dashboard",
  },
  {
    title: "How It Works",
    icon: <Info />,
    href: "/how-it-works",
  },
];

export default function AppDock() {
  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2">
      <Dock className="items-end pb-3">
        {items.map((item) => (
          <DockItem
            key={item.title}
            className="aspect-square rounded-full bg-zinc-800 text-white transition-colors hover:bg-amber-500"
          >
            <DockLabel>
              {item.title}
            </DockLabel>

            <DockIcon>
              <a
                href={item.href}
                className="flex h-full w-full items-center justify-center"
              >
                {item.icon}
              </a>
            </DockIcon>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}