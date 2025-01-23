const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const uuid = require("uuid");
const { dir } = require("console");

const app = express();
const PORT = 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const SEGMENT_DIR = path.join(__dirname, "segments");
const SAVED_SEGMENTS_DIR = path.join(__dirname, "saved_segments");

if (!fs.existsSync(SEGMENT_DIR)) {
  console.error(`Segments directory does not exist at ${SEGMENT_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(SAVED_SEGMENTS_DIR)) {
     fs.mkdirSync(SAVED_SEGMENTS_DIR)
}

let currentSegmentIndex = 0;
let currentSegments = [];
let currentVideoTime = 0;
let isPlaying = false;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.emit("initial-segment", {
    currentSegmentIndex,
    currentSegments,
    currentVideoTime,
    isPlaying,
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on("video-event", (data) => {
    console.log(`Video event received from ${socket.id}`, data);
    if (data.type === "play") {
      isPlaying = true;
    } else if (data.type === "pause") {
      isPlaying = false;
    } else if (data.type === "rewind") {
      currentVideoTime = data.timestamp;
    }
    io.emit("video-event", data);
  });

  socket.on("segment-change", (data) => {
    currentSegmentIndex = data.currentSegmentIndex;
    currentSegments = data.currentSegments;
    io.emit("segment-change", data);
  });
});

// Endpoint to list segments
app.get("/list-segments", (req, res) => {
  const { baseName } = req.query;
  if (!baseName) {
    return res.status(400).json({ error: "Base Name is required." });
  }
  try {
    const segments = fs
      .readdirSync(SEGMENT_DIR)
      .filter(
        (segment) => segment.startsWith(baseName) && segment.endsWith(".mp4")
      );

    if (segments.length === 0) {
      return res
        .status(404)
        .json({ error: "No segments found for specified base name." });
    }
    currentSegments = segments;
    res.json({ segments });
  } catch (error) {
    console.error("Error listing segments:", error);
    res.status(500).json({ error: "Failed to list segments" });
  }
});

// Endpoint to stream video segment
app.get("/stream-segment", (req, res) => {
  const { segmentName } = req.query;
  if (!segmentName) {
    return res.status(400).json({ error: "Segment Name is required" });
  }
  const segmentPath = path.join(SEGMENT_DIR, segmentName);
  if (!fs.existsSync(segmentPath)) {
    return res.status(404).json({ error: `Segment ${segmentName} not found.` });
  }
  const readStream = fs.createReadStream(segmentPath);
  res.setHeader("Content-Type", "video/mp4");
  readStream.pipe(res);
});

//End-point to save the segments as user clicks
app.post("/save-segment", express.json(), (req, res) => {
    const { videoData } = req.body;
    if (!videoData) {
      return res.status(400).json({ error: "Video data is required" });
    }
  
    // console.log("Received videoData:", videoData);
    if (
      typeof videoData !== "string" ||
      !videoData.match(/^data:video\/mp4;base64,/)
    ) {
      return res.status(400).json({ error: "Invalid video data format. Expected a base64 string." });
    }
  
    const base64Data = videoData.replace(/^data:video\/mp4;base64,/, "");
    const videoBuffer = Buffer.from(base64Data, "base64");
    const segmentName = `video_segment_${uuid.v4()}.mp4`;
  
    if (!fs.existsSync(SAVED_SEGMENTS_DIR)) {
      fs.mkdirSync(SAVED_SEGMENTS_DIR);
    }
  
    const filePath = path.join(SAVED_SEGMENTS_DIR, segmentName);
    fs.writeFile(filePath, videoBuffer, (err) => {
      if (err) {
        console.error("Error saving video segment:", err);
        return res.status(500).json({ error: "Failed to save segment" });
      }
      res.status(200).json({ message: `Segment saved successfully as ${segmentName}` });
    });
  });


  const fsp = require('fs').promises;

  app.get("/get-latest-video", async (req, res) => {
    const dirPath = path.join(__dirname, "saved_segments");
  
    try {
      const dirExists = await fsp.access(dirPath).then(()=> true).catch(()=> false)
      if (!dirExists) {
          return res.status(404).json({
              error: "Saved segments directory not found",
          });
      }
  
      const files = await fsp.readdir(dirPath);
      const videoFiles = files.filter((file) => file.endsWith(".mp4"));
  
      if (videoFiles.length === 0) {
          return res.status(404).json({
              error: "No video segments found.",
          });
      }
  
        const latestVideoFile = (await Promise.all(
          videoFiles.map(async (file) => {
              const stats = await fsp.stat(path.join(dirPath, file));
              return { file, mtime: stats.mtime.getTime() };
          })
        )).sort((a, b) => b.mtime - a.mtime)[0].file;
  
  
        res.status(200).json({
          latestVideoFile: latestVideoFile,
        });
      }
      catch (error){
        console.error("Error in get-latest-video", error);
          res.status(500).json({
              error : "Internal server error while fetching the latest video."
          })
      }
  
  });


// Endpoint to serve files from saved_segments directory
app.get("/saved_segments/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(SAVED_SEGMENTS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  console.log("Clip file path",filePath);
  res.sendFile(filePath);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});