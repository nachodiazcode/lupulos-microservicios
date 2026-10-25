import { createService, portOf } from "../../shared/service.mjs";

// The simplest possible event bus: services subscribe with a URL, and every
// published event is POSTed to the subscribers of its type. Real systems use
// RabbitMQ, Kafka or SQS, which also retry and keep events if a service is down.
const { app, listen } = createService("event-bus");

/** event type → URLs to notify */
const subscribers = new Map();

app.post("/subscribe", (req, res) => {
  const { type, url } = req.body;
  const list = subscribers.get(type) || new Set();
  list.add(url);
  subscribers.set(type, list);
  res.status(201).json({ subscribed: type, url });
});

app.post("/events", (req, res) => {
  const event = { ...req.body, at: new Date().toISOString() };
  const targets = [...(subscribers.get(event.type) || [])];

  // Answer right away: the publisher doesn't wait for the subscribers.
  res.status(202).json({ accepted: event.type, deliveredTo: targets.length });

  for (const url of targets) {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) })
      .catch((err) => console.error(`[event-bus] no se pudo entregar ${event.type} a ${url}: ${err.message}`));
  }
});

listen(portOf("bus"));
