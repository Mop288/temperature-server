const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// POST: ghi dữ liệu
app.post("/temperature/:station", (req, res) => {
  const station = req.params.station;
  const value = req.body.value;
  const timestamp = new Date().toISOString();

  db.run(
    `INSERT INTO temperatures (station, value, timestamp) VALUES (?, ?, ?)`,
    [station, value, timestamp],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "saved", station, value, timestamp });
    }
  );
});

// GET: lấy dữ liệu theo station
app.get("/temperature/:station", (req, res) => {
  const station = req.params.station;

  db.all(
    `SELECT * FROM temperatures WHERE station = ? ORDER BY timestamp DESC`,
    [station],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// GET: tất cả dữ liệu
app.get("/temperature", (req, res) => {
  db.all(`SELECT * FROM temperatures ORDER BY timestamp DESC`, [], (err, rows) => {
    res.json(rows);
  });
});

app.listen(10000, () => console.log("Server running on port 10000"));
