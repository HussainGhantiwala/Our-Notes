import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "home" },
  { to: "/chapters", label: "chapters" },
  { to: "/gallery", label: "memories" },
  { to: "/bouquet", label: "bouquet" },
  { to: "/notes", label: "notes" },
  { to: "/letters", label: "letters" },
  { to: "/secret", label: "secret" },
];

export const JournalNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled ? "py-2 bg-background/80 backdrop-blur-sm shadow-paper" : "py-4 bg-transparent"
      }`}
    >
      <nav className="container flex items-center justify-between gap-4">
        <NavLink to="/" className="font-script text-2xl md:text-3xl text-ink shrink-0">
          Our Story
        </NavLink>
        <ul className="hidden md:flex items-center gap-1 lg:gap-3 font-hand text-lg text-ink-soft">
          {links.slice(1).map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full transition-all hover:text-ink ${
                    isActive ? "bg-blush/60 text-ink" : ""
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full hover:text-ink ${isActive ? "bg-rose/30 text-ink" : "text-rose"}`
                }
              >
                ✎ desk
              </NavLink>
            </li>
          )}
        </ul>
        <MobileMenu currentPath={location.pathname} isAdmin={isAdmin} />
      </nav>
    </header>
  );
};

const MobileMenu = ({ currentPath, isAdmin }: { currentPath: string; isAdmin: boolean }) => {
  const [open, setOpen] = useState(false);
  const all = isAdmin ? [...links, { to: "/admin", label: "✎ desk" }] : links;
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open menu"
        className="font-hand text-lg text-ink px-3 py-1.5 rounded-full bg-blush/50"
      >
        {open ? "close" : "menu"}
      </button>
      {open && (
        <div
          className="fixed inset-x-4 top-16 paper rounded-md p-5 z-50 animate-fade-up"
          onClick={() => setOpen(false)}
        >
          <ul className="flex flex-col gap-3 font-hand text-2xl text-ink">
            {all.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={`block py-1 ${currentPath === l.to ? "text-rose" : ""}`}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
