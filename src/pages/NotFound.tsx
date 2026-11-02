import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--pr-soft, #f3f4f6)", color: "var(--pr-ink, #0B0B0F)" }}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl mb-4" style={{ color: "var(--pr-mute, #4b5563)" }}>Oops! Page not found</p>
        <a href="/" className="underline" style={{ color: "var(--pr-accent, #6C47FF)" }}>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
