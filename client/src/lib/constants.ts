// Small set of constants the frontend needs to talk to the backend API.
// Keep these in sync with the backend's shared/const.ts (server/routers.ts
// throws UNAUTHED_ERR_MSG verbatim when a protected call has no session).
export const UNAUTHED_ERR_MSG = "Please login (10001)";
