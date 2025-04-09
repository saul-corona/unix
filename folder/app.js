const fs = require("node:fs");
const path = require("node:path");
require("./file.js");

console.log("DIRNAME", __dirname);
console.log("FILENAME", __filename);
console.log(process.cwd());
const content = fs.readFileSync(path.join(__dirname, "./text.txt"), "utf-8");
console.log(content);
