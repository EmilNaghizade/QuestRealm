import { t } from "../lib/i18n";
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
          aria-label={t("Open navigation menu")}
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
            <p className="eyebrow">{t("Your adventure")}</p>
            <h2 id="mobile-menu-title">{t("Explore your realm")}</h2>
          </div>

          <button
            className="mobile-menu-close"
            type="button"
            aria-label={t("Close navigation menu")}
            autoFocus
            onClick={closeMenu}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="mobile-menu-links" aria-label={t("Mobile navigation")}>
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
              <strong>{t("Today")}</strong>
              <small>{t("Your daily quests")}</small>
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
              <strong>{t("Focus")}</strong>
              <small>{t("Your timer, insights and history")}</small>
            </span>
            <span className="mobile-menu-arrow" aria-hidden="true">
              →
            </span>
          </a>

          <a className={`mobile-menu-link ${page === "character" ? "mobile-menu-link-active" : ""}`} href="#character" aria-current={page === "character" ? "page" : undefined} onClick={closeMenu}>
            <span aria-hidden="true">♙</span><span><strong>{t("Character")}</strong><small>{t("Your story, equipment and market")}</small></span><span aria-hidden="true">→</span>
          </a>

          <a className={`mobile-menu-link ${page === "kingdoms" ? "mobile-menu-link-active" : ""}`} href="#kingdoms" aria-current={page === "kingdoms" ? "page" : undefined} onClick={closeMenu}><span aria-hidden="true">⚑</span><span><strong>{t("Kingdoms")}</strong><small>{t("Your frontier and conquered lands")}</small></span><span aria-hidden="true">→</span></a>
          <a className={`mobile-menu-link ${page === "profile" ? "mobile-menu-link-active" : ""}`} href="#profile" aria-current={page === "profile" ? "page" : undefined} onClick={closeMenu}><span aria-hidden="true">♙</span><span><strong>{t("Profile")}</strong></span></a>

          <a className={`mobile-menu-link ${page === "achievements" ? "mobile-menu-link-active" : ""}`} href="#achievements" aria-current={page === "achievements" ? "page" : undefined} onClick={closeMenu}><span aria-hidden="true">✦</span><span><strong>{t("Achievements")}</strong><small>{t("Achievements & daily streak")}</small></span></a>
          <a className={`mobile-menu-link ${page==="library"?"mobile-menu-link-active":""}`} href="#library" aria-current={page==="library"?"page":undefined} onClick={closeMenu}><span aria-hidden="true">▤</span><span><strong>{t("Reading library")}</strong><small>{t("Books, articles and notes")}</small></span></a>
<a className={`mobile-menu-link ${page === "settings" ? "mobile-menu-link-active" : ""}`} href="#settings" aria-current={page === "settings" ? "page" : undefined} onClick={closeMenu}><span aria-hidden="true">⚙</span><span><strong>{t("Settings")}</strong></span></a>
        </nav>

        <div className="mobile-menu-footer">
          {!installed && (
            <button
              className="button button-primary"
              type="button"
              onClick={openInstallation}
            >
              <span aria-hidden="true">↓</span> {t("Install QuestRealm")} </button>
          )}

          <p>{t("Small steps. Great adventures.")}</p>
        </div>
      </dialog>
    </>
  );
}
