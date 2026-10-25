// Walks through the system from the outside, only through the gateway.
const GATEWAY = "http://localhost:4000";
const call = async (method, path, body) => {
  const res = await fetch(GATEWAY + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  console.log(`\n${method} ${path} → ${res.status}`);
  console.log(JSON.stringify(data, null, 2));
  return data;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await call("GET", "/api/health");
await call("GET", "/api/beers");
await call("POST", "/api/reviews", { beerId: "1", rating: 5, comment: "La compañera del asado" });
await call("POST", "/api/reviews", { beerId: "1", rating: 4 });
await call("POST", "/api/reviews", { beerId: "99", rating: 3 });
await wait(300); // the average arrives by event, a moment later
await call("GET", "/api/beers/1");
