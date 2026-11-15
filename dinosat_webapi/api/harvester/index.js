const engine = require("./engine");

const DOMAINS = [
  require("./modules/sat/monitors/satellitefeeds"),
  require("./modules/sat/monitors/earthconditions"),
  require("./modules/sat/trackers/satellites"),
  require("./modules/sat/trackers/asteroids"),
  require("./modules/sat/trackers/comets"),
  require("./modules/sat/trackers/flights"),
  require("./modules/sat/trackers/weather"),
];

engine.registerDomains(DOMAINS);

module.exports = {
  router: engine.router,
  start: engine.start,
  stop: engine.stop,
  status: engine.status
};

if (require.main === module) {
  const shutdown = async () => {
    await engine.stop();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  engine.start({ mode: "worker" }).catch(() => process.exit(1));
}