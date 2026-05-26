import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getClubTokenFromUrl } from "@/hooks/use-club-auth";

setAuthTokenGetter(getClubTokenFromUrl);

createRoot(document.getElementById("root")!).render(<App />);
