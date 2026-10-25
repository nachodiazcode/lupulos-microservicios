import { createService, HttpError, SERVICES, portOf } from "../../shared/service.mjs";

// The beers service owns the beers data. Nobody else reads or writes it
// directly: other services ask through this HTTP API.
const { app, listen } = createService("beers");

const beers = new Map([
  ["1", { id: "1", name: "Kunstmann Torobayo", style: "Amber", rating: null, reviews: 0 }],
  ["2", { id: "2", name: "Austral Calafate", style: "Ale", rating: null, reviews: 0 }],
]);
let nextId = 3;

app.get("/beers", (_req, res) => res.json([...beers.values()]));

app.get("/beers/:id", (req, res) => {
  const beer = beers.get(req.params.id);
  if (!beer) throw new HttpError(404, "No existe esa cerveza");
  res.json(beer);
});

app.post("/beers", (req, res) => {
  const { name, style } = req.body;
  if (!name || !style) throw new HttpError(400, "Faltan name o style");
  const beer = { id: String(nextId++), name, style, rating: null, reviews: 0 };
  beers.set(beer.id, beer);
  res.status(201).json(beer);
});

// Event handler: the bus calls this when a review is created somewhere else.
// The average updates a moment later; that's eventual consistency.
app.post("/events/review-created", (req, res) => {
  const { beerId, rating } = req.body.payload;
  const beer = beers.get(beerId);
  if (beer) {
    const total = (beer.rating ?? 0) * beer.reviews + rating;
    beer.reviews += 1;
    beer.rating = Math.round((total / beer.reviews) * 10) / 10;
    console.log(`[beers] ${beer.name}: nuevo promedio ${beer.rating} (${beer.reviews} reseñas)`);
  }
  res.sendStatus(204);
});

listen(portOf("beers"));

// Subscribe once the bus is up. Retries cover the bus starting a bit later.
async function subscribe(attempt = 1) {
  try {
    await fetch(`${SERVICES.bus}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "review.created", url: `${SERVICES.beers}/events/review-created` }),
    });
    console.log("[beers] suscrito a review.created");
  } catch {
    if (attempt < 10) setTimeout(() => subscribe(attempt + 1), 500);
  }
}
subscribe();
