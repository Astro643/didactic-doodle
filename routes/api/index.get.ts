export default async () =>
  Response.json({
    name: "controller-backend",
    status: "ok",
    endpoints: [
      "POST /api/auth/login",
      "GET /api/auth/session",
      "POST /api/auth/logout",
      "GET /api/admin/controls",
      "PATCH /api/admin/controls",
      "POST /api/preview",
      "POST /api/execute",
      "POST /api/agent/preview",
      "POST /api/agent/execute",
      "GET /api/status/:id",
      "POST /api/cancel/:id",
      "GET /api/public/status",
      "POST /api/support/chat",
    ],
  });
