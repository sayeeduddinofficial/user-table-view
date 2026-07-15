import { Configuration } from "@azure/msal-browser";
import { env } from "@/lib/env";

export const msalConfig: Configuration = {
    auth: {
        clientId: env.entraClientId || "",
        authority: `https://login.microsoftonline.com/${env.entraTenantId}`,
        redirectUri: env.entraRedirectUri
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: true,
    },
};

export const loginRequest = {
    scopes: [
    "openid",
    "profile",
    "email",
    `api://${env.entraClientId}/access_as_user`
  ]
};