import { spawn } from "node:child_process";

// Starts every service as its own process, like separate servers would be.
const services = ["event-bus", "beers", "reviews", "gateway"];
const children = services.map((name) =>
  spawn(process.execPath, [`services/${name}/index.mjs`], { stdio: "inherit" }),
);

const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
