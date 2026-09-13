import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_, response) => {
  response.json({
    status: "ok",
    service: "aniverse-api",
    timestamp: new Date().toISOString()
  });
});
