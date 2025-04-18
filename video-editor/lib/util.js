const fs = require("node:fs/promises");

const util = {};

util.deleteFolder = async path => {
  try {
    await fs.rm(path, { recursive: true });
  } catch (e) {
    console.log(e);
  }
};

module.exports = util;
