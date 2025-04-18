const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const DB = require("../DB");
const util = require("../../lib/util");

const getVideos = (req, res, handleErr) => {
  const name = req.params.get("name");
  if (name) {
    res.json({ message: `Your name is ${name}` });
  } else {
    return handleErr({ status: 400, message: "Name is required" });
  }
};

const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");

  try {
    await fs.mkdir(`./storage/${videoId}`);
    const fullPath = `./storage/${videoId}/original.${extension}`;
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();

    await pipeline(req, fileStream);
    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      extension,
      createdAt: new Date().toISOString(),
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });
    DB.save();
    res.status(200).json({
      status: "success",
      message: "Video uploaded successfully",
    });
  } catch (e) {
    util.deleteFolder(`./storage/${videoId}`);
    if (e.code !== "ECONNRESET") return handleErr(e);
  }
};

const controller = {
  getVideos,
  uploadVideo,
};

module.exports = controller;
