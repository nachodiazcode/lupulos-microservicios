import { createService, HttpError, SERVICES, portOf } from "../../shared/service.mjs";

// The reviews service owns the reviews data. To check that a beer exists it
// asks the beers service (synchronous call), and after saving it publishes an
// event (asynchronous) instead of telling the beers service what to do.
const { app, listen } = createService("reviews");

const reviews = [];

async function beerExists(beerId) {
  let res;
  try {
    // A timeout keeps one slow service from freezing this one.
    res = await fetch(`${SERVICES.beers}/beers/${beerId}`, { signal: AbortSignal.timeout(2000) });
  } catch {
    throw new HttpError(503, "El servicio de cervezas no responde; intenta en un momento");
  }
  if (res.status === 404) return false;
  if (!res.ok) throw new HttpError(502, "El servicio de cervezas respondió con un error");
  return true;
}

app.get("/reviews", (req, res) => {
  const { beerId } = req.query;
  res.json(beerId ? reviews.filter((r) => r.beerId === beerId) : reviews);
});

app.post("/reviews", async (req, res, next) => {
  try {
    const { beerId, rating, comment = "" } = req.body;
    if (!beerId || !(rating >= 1 && rating <= 5)) throw new HttpError(400, "Necesito beerId y un rating de 1 a 5");
    if (!(await beerExists(beerId))) throw new HttpError(404, "No existe esa cerveza");

    const review = { id: String(reviews.length + 1), beerId, rating, comment };
    reviews.push(review);

    // Fire and forget: if the bus is down the review is still saved.
    fetch(`${SERVICES.bus}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "review.created", payload: { beerId, rating } }),
    }).catch(() => console.error("[reviews] no se pudo publicar review.created"));

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

listen(portOf("reviews"));
