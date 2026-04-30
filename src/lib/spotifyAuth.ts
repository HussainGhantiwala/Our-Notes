const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? "";

export const SPOTIFY_ACCESS_TOKEN_KEY = "spotify_access_token";
export const SPOTIFY_VERIFIER_KEY = "spotify_verifier";

const SPOTIFY_REDIRECT_URI_KEY = "spotify_redirect_uri";
const SPOTIFY_AUTH_EVENT = "spotify-auth-changed";
const SPOTIFY_SCOPES =
  "playlist-modify-public playlist-modify-private user-read-private";

interface SpotifyTokenResponse {
  access_token?: string;
}

const base64UrlEncode = (input: ArrayBuffer | Uint8Array) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const getCurrentRedirectUri = () => window.location.origin;

export function getSpotifyAuthEventName() {
  return SPOTIFY_AUTH_EVENT;
}

export function getSpotifyAccessToken() {
  return localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY)?.trim() ?? "";
}

export function emitSpotifyAuthChange() {
  window.dispatchEvent(new Event(SPOTIFY_AUTH_EVENT));
}

export function setSpotifyAccessToken(token: string) {
  localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, token.trim());
  emitSpotifyAuthChange();
}

export function clearSpotifyAccessToken() {
  localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
  emitSpotifyAuthChange();
}

export function clearSpotifyAuthState() {
  localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
  localStorage.removeItem(SPOTIFY_REDIRECT_URI_KEY);
}

export function clearSpotifyAuthCallbackFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

export function generateCodeVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);

  const digest = await window.crypto.subtle.digest("SHA-256", data);

  return btoa(
    String.fromCharCode(...new Uint8Array(digest))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function redirectToSpotifyAuth() {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error("Missing VITE_SPOTIFY_CLIENT_ID");
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getCurrentRedirectUri();

  localStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);
  localStorage.setItem(SPOTIFY_REDIRECT_URI_KEY, redirectUri);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

export async function exchangeSpotifyCodeForAccessToken(code: string) {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error("Missing VITE_SPOTIFY_CLIENT_ID");
  }

  const verifier = localStorage.getItem(SPOTIFY_VERIFIER_KEY)?.trim() ?? "";
  const redirectUri = localStorage.getItem(SPOTIFY_REDIRECT_URI_KEY)?.trim() ?? getCurrentRedirectUri();

  if (!verifier) {
    throw new Error("Spotify sign-in could not be completed. Please reconnect.");
  }

  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token exchange failed (${response.status}): ${errorText}`);
  }

  const json = await response.json() as SpotifyTokenResponse;
  const token = json.access_token?.trim() ?? "";

  if (!token) {
    throw new Error("Spotify token exchange succeeded without an access token.");
  }

  setSpotifyAccessToken(token);
  clearSpotifyAuthState();
  return token;
}
