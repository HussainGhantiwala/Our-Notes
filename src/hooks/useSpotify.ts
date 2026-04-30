import { useEffect, useState } from "react";
import {
  getSpotifyAccessToken,
  getSpotifyAuthEventName,
  redirectToSpotifyAuth,
} from "@/lib/spotifyAuth";

const readAccessToken = () => {
  if (typeof window === "undefined") return "";
  return getSpotifyAccessToken();
};

export function useSpotify() {
  const [accessToken, setAccessToken] = useState(readAccessToken);

  useEffect(() => {
    const sync = () => setAccessToken(readAccessToken());
    const authEvent = getSpotifyAuthEventName();

    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(authEvent, sync);

    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(authEvent, sync);
    };
  }, []);

  return {
    connectSpotify: redirectToSpotifyAuth,
    accessToken,
    isConnected: !!accessToken,
  };
}
