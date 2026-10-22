import { createApiClient } from "@idea-district/api-client";

// On a device, localhost is the phone itself — set your machine's LAN IP in .env.
export const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000");
