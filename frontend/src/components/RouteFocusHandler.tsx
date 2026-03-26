import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteFocusHandler() {
  const location = useLocation();

  useEffect(() => {
    const id = setTimeout(() => {
      // prefer main-content then main
      const main = document.getElementById("main-content") || document.getElementById("main");
      if (main) (main as HTMLElement).focus();
    }, 50);

    return () => clearTimeout(id);
  }, [location.pathname]);

  return null;
}
