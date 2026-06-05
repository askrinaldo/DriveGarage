import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setExtraHeadersGetter } from "@workspace/api-client-react";
import { getClubTokenFromUrl } from "@/hooks/use-club-auth";
import { getUserToken } from "@/hooks/use-user-auth";

setAuthTokenGetter(getClubTokenFromUrl);
setExtraHeadersGetter((): Record<string, string> => {
  const token = getUserToken();
  return token ? { "x-user-token": token } : {};
});

createRoot(document.getElementById("root")!).render(<App />);
