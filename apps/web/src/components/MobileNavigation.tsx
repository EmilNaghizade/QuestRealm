import { getPageFromHash } from "../lib/navigation";
import BrandLogo from "./BrandLogo";
import { useEffect, useRef, useState } from "react";
import "./mobile-navigation.css";

function isStandalone(): boolean {
  const browserNavigator = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    browserNavigator.standalone === true
  );
}

export default function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflowRef = useRef<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [page, setPage] = useState(() => getPageFromHash(window.location.hash));
  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 850px)");
    const standaloneMode = window.matchMedia("(display-mode: standalone)");

    function handleHashChange() {
      setPage(getPageFromHash(window.location.hash));
    }

    function handleViewportChange() {
      if (!mobileViewport.matches) {
        dialogRef.current?.close();
      }
    }

    function handleInstallationChange() {
      setInstalled(isStandalone());
    }

    function handleInstalled() {
      setInstalled(true);
    }

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("appinstalled", handleInstalled);

    mobileViewport.addEventListener("change", handleViewportChange);
    standaloneMode.addEventListener("change", handleInstallationChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("appinstalled", handleInstalled);

      mobileViewport.removeEventListener("change", handleViewportChange);
      standaloneMode.removeEventListener("change", handleInstallationChange);

      if (previousOverflowRef.current !== null) {
        document.documentElement.style.overflow = previousOverflowRef.current;
      }
    };
  }, []);

  function openMenu() {
    const dialog = dialogRef.current;

    if (!dialog || dialog.open) return;

    previousOverflowRef.current = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";

    dialog.showModal();
    setIsOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  function handleClosed() {
    if (previousOverflowRef.current !== null) {
      document.documentElement.style.overflow = previousOverflowRef.current;

      previousOverflowRef.current = null;
    }

    setIsOpen(false);
  }

  function openInstallation() {
    closeMenu();

    window.dispatchEvent(new Event("questrealm:open-install"));
  }

  return (
    <>
      <header className="mobile-navigation-bar">
        <a className="brand" href="#dashboard">
          <BrandLogo/>
        </a>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation-dialog"
          onClick={openMenu}
        >
          <span className="mobile-hamburger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      <dialog
        ref={dialogRef}
        id="mobile-navigation-dialog"
        className="mobile-menu-dialog"
        aria-labelledby="mobile-menu-title"
        onClose={handleClosed}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;

          const bounds = event.currentTarget.getBoundingClientRect();

          const outside =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;

          if (outside) closeMenu();
        }}
      >
        <div className="mobile-menu-heading">
          <div>
            <p className="eyebrow">Your adventure</p>
            <h2 id="mobile-menu-title">Explore your realm</h2>
          </div>

          <button
            className="mobile-menu-close"
            type="button"
            aria-label="Close navigation menu"
            autoFocus
            onClick={closeMenu}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="mobile-menu-links" aria-label="Mobile navigation">
          <a
            className={`mobile-menu-link ${
              page === "dashboard" ? "mobile-menu-link-active" : ""
            }`}
            href="#dashboard"
            aria-current={page === "dashboard" ? "page" : undefined}
            onClick={closeMenu}
          >
            <span aria-hidden="true">▦</span>
            <span>
              <strong>Today</strong>
              <small>Your daily quests</small>
            </span>
            <span className="mobile-menu-arrow" aria-hidden="true">
              →
            </span>
          </a>

          <a
            className={`mobile-menu-link ${
              page === "focus" ? "mobile-menu-link-active" : ""
            }`}
            href="#focus"
            aria-current={page === "focus" ? "page" : undefined}
            onClick={closeMenu}
          >
            <span aria-hidden="true">◷</span>
            <span>
              <strong>Focus</strong>
              <small>Your timer, insights and history</small>
            </span>
            <span className="mobile-menu-arrow" aria-hidden="true">
              →
            </span>
          </a>

          <a className={`mobile-menu-link ${page === "character" ? "mobile-menu-link-active" : ""}`} href="#character" aria-current={page === "character" ? "page" : undefined} onClick={closeMenu}>
            <span aria-hidden="true">♙</span><span><strong>Character</strong><small>Your story, equipment and market</small></span><span aria-hidden="true">→</span>
          </a>

          <span
            className="mobile-menu-link mobile-menu-link-unavailable"
            aria-disabled="true"
          >
            <span aria-hidden="true">◇</span>
            <span>
              <strong>Kingdoms</strong>
              <small>A kingdom to discover</small>
            </span>
            <span className="badge badge-muted">Soon</span>
          </span>
        </nav>

        <div className="mobile-menu-footer">
          {!installed && (
            <button
              className="button button-primary"
              type="button"
              onClick={openInstallation}
            >
              <span aria-hidden="true">↓</span>
              Install QuestRealm
            </button>
          )}

          <p>Small steps. Great adventures.</p>
        </div>
      </dialog>
    </>
  );
}
