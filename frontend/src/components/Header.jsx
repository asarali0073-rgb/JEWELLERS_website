import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { shop } from "../config.js";

const links = [
  { to: "/", label: "Home" },
  { to: "/collection", label: "Collections" },
  { to: "/gold-rates", label: "Gold Rates" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const firstMenuLinkRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    function closeMenuOnDesktopResize() {
      if (window.innerWidth > 900) setOpen(false);
    }

    window.addEventListener("resize", closeMenuOnDesktopResize);
    return () => window.removeEventListener("resize", closeMenuOnDesktopResize);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        const focusable = menuRef.current?.querySelectorAll("a[href], button:not([disabled])");
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) firstMenuLinkRef.current?.focus();
  }, [open]);

  function closeMenu() {
    setOpen(false);
    if (open) menuButtonRef.current?.focus();
  }

  const menuVariants = {
    hidden: { x: reduceMotion ? 0 : "100%", opacity: reduceMotion ? 0 : 1 },
    visible: {
      x: 0,
      opacity: 1,
      transition: reduceMotion
        ? { duration: 0.01 }
        : { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const linkListVariants = {
    hidden: {},
    visible: {
      transition: reduceMotion ? {} : { staggerChildren: 0.055, delayChildren: 0.1 },
    },
  };
  const linkVariants = {
    hidden: { opacity: 0, x: reduceMotion ? 0 : 18 },
    visible: {
      opacity: 1,
      x: 0,
      transition: reduceMotion ? { duration: 0.01 } : { duration: 0.2 },
    },
  };

  return (
    <motion.header
      className={`header${scrolled ? " header--scrolled" : ""}`}
      initial={reduceMotion ? false : { y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0.01 } : { duration: 0.38, ease: "easeOut" }}
    >
      <Link to="/" className="brand" onClick={closeMenu} aria-label={`${shop} home`}>
        <span className="brandMark" aria-hidden="true">A</span>
        <span>
          <b>{shop}</b>
          <small>GOLD · ELEGANCE · HERITAGE</small>
        </span>
      </Link>

      <button
        ref={menuButtonRef}
        className="mobile"
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation-menu"
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <nav className="nav" aria-label="Primary navigation">
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            {({ isActive }) => (
              <>
                {label}
                {isActive && <motion.span className="navIndicator" layoutId="active-nav-indicator" />}
              </>
            )}
          </NavLink>
        ))}
        <NavLink className="adminLoginLink" to="/login">Admin Login</NavLink>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobileMenu"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeMenu();
            }}
          >
            <motion.nav
              ref={menuRef}
              id="mobile-navigation-menu"
              className="mobileMenuLinks"
              aria-label="Mobile navigation"
              variants={linkListVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {links.map(({ to, label }, index) => (
                <motion.div key={to} variants={linkVariants}>
                  <NavLink
                    ref={index === 0 ? firstMenuLinkRef : undefined}
                    to={to}
                    end={to === "/"}
                    onClick={closeMenu}
                  >
                    {label}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div variants={linkVariants}>
                <NavLink className="mobileAdminLink" to="/login" onClick={closeMenu}>
                  Admin Login
                </NavLink>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
