const { stdin, stdout, argv, exit } = require("process");
const fs = require("fs");

const filePath = argv[2];

if (filePath) {
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(stdout);
  fileStream.on("end", () => {
    stdout.write("\n");
    exit(0);
  });
}

stdin.on("data", data => {
  stdout.write(data.toString("utf-8").toUpperCase());
});

// sample: echo "some string" | node cat.js
