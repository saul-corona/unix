const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const DB = require("../DB");
const FF = require("../../lib/FF");
const util = require("../../lib/util");

const getVideos = (req, res, handleErr) => {
  DB.update();
  const videos = DB.videos.filter(video => {
    return video.userId === req.userId;
  });
  return res.status(200).json(videos);
};

const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).substring(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");

  const FORMATS_SUPPORTED = ["mp4", "mov", "avi", "mkv", "webm"];

  if (FORMATS_SUPPORTED.indexOf(extension) === -1) {
    return handleErr({
      status: 400,
      message: `Format ${extension} not supported`,
    });
  }
  try {
    await fs.mkdir(`./storage/${videoId}`);
    const fullPath = `./storage/${videoId}/original.${extension}`;
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();
    const thumbnailPath = `./storage/${videoId}/thumbnail.jpg`;

    await pipeline(req, fileStream);

    // Make thumbnail
    await FF.makeThumbnail(fullPath, thumbnailPath);

    // Get dimensions
    const dimensions = await FF.getDimensions(fullPath);

    // Resize video

    DB.update();

    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      extension,
      dimensions,
      createdAt: new Date().toISOString(),
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });

    DB.save();

    res.status(201).json({
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
