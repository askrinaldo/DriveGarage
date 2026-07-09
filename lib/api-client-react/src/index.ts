export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  setExtraHeadersGetter,
  setClerkTokenGetter,
  customFetch,
} from "./custom-fetch";
export type { AuthTokenGetter, ExtraHeadersGetter } from "./custom-fetch";
