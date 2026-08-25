import { createContext, useContext, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "./MobileMenu.css";

const MobileMenuContext = createContext(null);

export function MobileMenuProvider({ children }) {
  const [open, setOpen] = useState(false);
const location = useLocation();

const hideMobileMenu =
  location.pathname === "/signup" ||
  location.pathname === "/signin";

  // Close the drawer whenever navigation changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Prevent the page behind the drawer from scrolling.
  useEffect(() => {
    if (open) {
      document.body.classList.add("mobile-menu-lock");
    } else {
      document.body.classList.remove("mobile-menu-lock");
    }

    return () => {
      document.body.classList.remove("mobile-menu-lock");
    };
  }, [open]);

 return (
  <MobileMenuContext.Provider
    value={{
      open,
      openMenu: () => setOpen(true),
      closeMenu: () => setOpen(false),
      toggleMenu: () =>
        setOpen((value) => !value),
    }}
  >
    <div
      className={`mobile-menu-root ${
        open ? "is-open" : ""
      }`}
    >
      {children}

      {location.pathname !== "/join-tournament" &&
        !hideMobileMenu && (
          <button
            type="button"
            className="mobile-menu-trigger"
            aria-label={
              open
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={open}
            onClick={() =>
              setOpen((value) => !value)
            }
          >
            {open ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        )}
    </div>
  </MobileMenuContext.Provider>
);
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);

  if (!context) {
    throw new Error(
      "useMobileMenu must be used inside MobileMenuProvider"
    );
  }

  return context;
}