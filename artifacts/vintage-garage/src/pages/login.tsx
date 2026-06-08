import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Login() {
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      navigate("/dashboard");
    } else {
      window.location.replace(`${basePath}/sign-in`);
    }
  }, [isLoaded, isSignedIn, navigate]);

  return null;
}
