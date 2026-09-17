import {
  Home,
  LayoutDashboard,
  ListOrdered,
  Utensils,
  Info,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Dock, DockIcon, DockItem, DockLabel } from "./ui/dock.jsx";

const items = [
  { title: "Home", icon: <Home />, href: "/" },
  { title: "Dashboard", icon: <LayoutDashboard />, href: "/dashboard" },
  { title: "Queue", icon: <ListOrdered />, href: "/dashboard", section: "queue" },
  { title: "Food", icon: <Utensils />, href: "/dashboard", section: "food" },
  { title: "How It Works", icon: <Info />, href: "/how-it-works" },
];

function scrollToSection(section) {
  if (section === "queue") {
    document.querySelector("main section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (section === "food") {
    const cards = document.querySelectorAll("main aside > div");
    cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function AppDock() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleSectionClick(section) {
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
      window.setTimeout(() => scrollToSection(section), 300);
      return;
    }
    scrollToSection(section);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2">
      <Dock className="items-end pb-3">
        {items.map((item) => (
          <DockItem
            key={item.title}
            className="aspect-square rounded-full bg-zinc-800 text-white transition-colors hover:bg-amber-500"
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>
              {item.section ? (
                <button
                  type="button"
                  onClick={() => handleSectionClick(item.section)}
                  className="flex h-full w-full items-center justify-center"
                  aria-label={item.title}
                >
                  {item.icon}
                </button>
              ) : (
                <Link
                  to={item.href}
                  className="flex h-full w-full items-center justify-center"
                  aria-label={item.title}
                >
                  {item.icon}
                </Link>
              )}
            </DockIcon>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}
