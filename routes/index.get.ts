export default async () => {
  return Response.json({
    name: "controller-backend",
    status: "ok",
    endpoints: [
      "POST /api/preview",
      "POST /api/execute",
      "GET /api/status/:id",
      "POST /api/cancel/:id",
      "GET /api/public/status",
      "POST /api/support/chat",
    ],
  });
};
