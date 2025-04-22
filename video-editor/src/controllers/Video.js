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

const extractAudio = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");

  DB.update();

  const video = DB.videos.find(video => video.videoId === videoId);

  if (video.extractedAudio) {
    return handleErr({
      status: 400,
      message: "Audio already extracted",
    });
  }

  try {
    const originalVideoPath = `./storage/${videoId}/original.${video.extension}`;
    const targetAudioPath = `./storage/${videoId}/audio.aac`;

    await FF.extractAudio(originalVideoPath, targetAudioPath);

    video.extractedAudio = true;

    DB.save();

    res.status(200).json({
      status: "success",
      message: "Audio extracted successfully",
    });
  } catch (e) {
    util.deleteFile(targetAudioPath);
    return handleErr(e);
  }
};

const getVideoAsset = async (req, res, handleErr) => {
  let file;
  let mimeType;
  let filename;
  const videoId = req.params.get("videoId");
  const type = req.params.get("type");

  DB.update();
  const video = DB.videos.find(video => video.videoId === videoId);

  if (!video) {
    return handleErr({
      status: 404,
      message: "Video not found",
    });
  }

  switch (type) {
    case "thumbnail":
      file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
      mimeType = "image/jpeg";
      break;
    case "audio":
      file = await fs.open(`./storage/${videoId}/audio.aac`, "r");
      mimeType = "audio/aac";
      filename = `${video.name}-audio.aac`;
      break;
    case "resize":
      const dimensions = req.params.get("dimensions");
      file = await fs.open(
        `./storage/${videoId}/${dimensions}.${video.extension}`,
        "r"
      );
      mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
      filename = `${video.name}-${dimensions}.${video.extension}`;
      break;
    case "original":
      file = await fs.open(
        `./storage/${videoId}/original.${video.extension}`,
        "r"
      );
      mimeType = `video/${video.extension}`;
      filename = `${video.name}.${video.extension}`;
  }

  const stat = await file.stat();

  const fileStream = file.createReadStream();

  if (type !== "thumbnail") {
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", stat.size);

  res.status(200);

  await pipeline(fileStream, res);

  file.close();
};

const controller = {
  getVideos,
  uploadVideo,
  extractAudio,
  getVideoAsset,
};

module.exports = controller;
