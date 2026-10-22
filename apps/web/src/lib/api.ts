import { createApiClient } from "@idea-district/api-client";

export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");
