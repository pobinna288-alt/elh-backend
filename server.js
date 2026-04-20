require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 4010;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    success: true,
    message: "Backend is running",
  });
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
