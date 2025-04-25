const cluster = require("node:cluster");
const JobQueue = require("../lib/JobQueue");

if (cluster.isPrimary) {
  const jobs = new JobQueue();

  const coreCount = require("node:os").availableParallelism();

  for (let i = 0; i < coreCount; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message) => {
    if (message.messageType === "new-resize") {
      const { videoId, height, width } = message.data;
      jobs.enqueue({
        type: "resize",
        videoId,
        height,
        width,
      });
    }
  });
} else {
  require("./index.js");
}
