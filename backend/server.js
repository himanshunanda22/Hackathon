const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const SEGMENT_DIR = path.join(__dirname, "segments");

if (!fs.existsSync(SEGMENT_DIR)) {
  console.error(`Segments directory does not exist at: ${SEGMENT_DIR}`);
  process.exit(1);
}

app.get("/list-segments", (req, res) => {
  const { baseName } = req.query;

  if (!baseName) {
    return res.status(400).json({ error: "Base name is required." });
  }
  try {
    const segments = fs
      .readdirSync(SEGMENT_DIR)
      .filter((segment) => segment.startsWith(baseName) && segment.endsWith(".mp4"));

    if (segments.length === 0) {
      return res.status(404).json({ error: "No segments found for the specified base name." });
    }

    res.json({ segments });
  } catch (error) {
    console.error("Error reading segments:", error);
    res.status(500).json({ error: "Internal server error while fetching segments." });
  }
});
app.get("/stream-segment", (req, res) => {
  const { segmentName } = req.query;

  if (!segmentName) {
    return res.status(400).json({ error: "Segment name is required." });
  }

  try {
    const segmentPath = path.join(SEGMENT_DIR, segmentName);

    if (!fs.existsSync(segmentPath)) {
      return res.status(404).json({ error: `Segment ${segmentName} not found.` });
    }
    const readStream = fs.createReadStream(segmentPath);
    res.setHeader("Content-Type", "video/mp4");
    readStream.pipe(res);
  } catch (error) {
    console.error("Error streaming segment:", error);
    res.status(500).json({ error: "Internal server error while streaming segment." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
