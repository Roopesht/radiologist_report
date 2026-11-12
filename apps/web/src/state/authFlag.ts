// Login flag for the web app. VITE_AUTH_ENABLED=false hides the sign-in token field (the API ignores tokens when its own
// AUTH_ENABLED flag is off). Anything other than "false", including unset, keeps the sign-in field.
export const AUTH_ENABLED: boolean = (import.meta as any).env?.VITE_AUTH_ENABLED !== 'false';
