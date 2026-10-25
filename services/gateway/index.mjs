import { createService, SERVICES, portOf } from "../../shared/service.mjs";

// The gateway is the only address clients know. It forwards each request to
// the service that owns it, so services can move or split without clients noticing.
const { app, listen } = createService("gateway");

const ROUTES = [
  { prefix: "/api/beers", target: SERVICES.beers, rewrite: "/beers" },
  { prefix: "/api/reviews", target: SERVICES.reviews, rewrite: "/reviews" },
];

// One health check for the whole system: asks every service.
app.get("/api/health", async (_req, res) => {
  const names = ["beers", "reviews", "bus"];
  const results = await Promise.all(
    names.map((name) =>
      fetch(`${SERVICES[name]}/health`, { signal: AbortSignal.timeout(1000) })
        .then((r) => (r.ok ? "ok" : "error"))
        .catch(() => "caído"),
    ),
  );
  const status = Object.fromEntries(names.map((n, i) => [n, results[i]]));
  const allOk = results.every((r) => r === "ok");
  res.status(allOk ? 200 : 503).json({ gateway: "ok", ...status });
});

app.use(async (req, res) => {
  const route = ROUTES.find((r) => req.path.startsWith(r.prefix));
  if (!route) return res.status(404).json({ error: `No hay servicio para ${req.path}` });

  const url = route.target + req.originalUrl.replace(route.prefix, route.rewrite);
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(3000),
    });
    res.status(upstream.status).type("json").send(await upstream.text());
  } catch {
    res.status(503).json({ error: "El servicio no está disponible" });
  }
});

listen(portOf("gateway"));
