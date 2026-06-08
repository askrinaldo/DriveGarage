import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Register() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/login");
  }, [navigate]);

  return null;
}
