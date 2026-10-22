/* Shapes returned by services/api. Keep in step with the Pydantic schemas there. */

export type Health = {
  status: "ok";
  database: string;
  ai_provider: string;
};

export type ApiErrorBody = { error: string; detail?: string };
