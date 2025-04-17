const cluster = require("node:cluster");

if (cluster.isPrimary) {
  let requestCount = 0;

  setInterval(() => {
    console.log(`Total number of requests: ${requestCount}`);
  }, 5000);

  console.log(`This is the parent with PID ${process.pid}.`);

  const coresCount = require("node:os").availableParallelism();
  for (let i = 0; i < coresCount; i++) {
    const worker = cluster.fork();
    worker.send("some data");
    console.log(
      `The parent process spawned a new child process with PID ${worker.process.pid}`
    );
  }

  cluster.on("message", (worker, message) => {
    if (message.action && message.action === "request") {
      requestCount++;
    }
  });

  cluster.on("fork", (worker) => {});

  cluster.on("listening", (worker, address) => {});

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} ${signal || code} died. Restarting...`
    );
    cluster.fork();
  });
} else {
  require("./server.js");
}
