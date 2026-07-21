import { useEffect } from "react";
import { useLocation } from "wouter";

export function useNavigationGuard(isDirty: boolean, message = "Du har ulagret tekst. Er du sikker på at du vil forlate siden?") {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isDirty) return;

    const guardedPath = window.location.pathname + window.location.search + window.location.hash;
    const originalPushState = history.pushState.bind(history);

    // 1. Browser close / refresh / hard navigation to external URL
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    // 2. In-app link clicks — capture phase fires before wouter's handler.
    //    Intercept, show confirm, then use wouter's navigate() for SPA routing.
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.href.startsWith("mailto:")) return;
      e.preventDefault();
      e.stopPropagation();
      const dest = anchor.pathname + anchor.search + anchor.hash;
      if (window.confirm(message)) {
        navigate(dest);
      }
    };

    // 3. Browser back / forward — window.location is already the destination
    //    when popstate fires. Restore original path with the unpatched pushState,
    //    then navigate for real only if the user confirms.
    const handlePopState = () => {
      const destination = window.location.href;
      originalPushState(null, "", guardedPath);
      if (window.confirm(message)) {
        window.location.assign(destination);
      }
      // Cancelled: guardedPath is already restored above — nothing more needed.
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, message, navigate]);
}
