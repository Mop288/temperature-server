const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Thư mục chứa file dữ liệu
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// API nhận nhiệt độ từ ESP32
app.post("/data", (req, res) => {
    const { station, temperature } = req.body;

    if (!station || temperature === undefined) {
        return res.status(400).send("Missing station or temperature");
    }

    const filepath = path.join(dataDir, `${station}.txt`);

    const line = `${new Date().toLocaleTimeString()} - Nhiệt độ: ${temperature}°C\n`;

    fs.appendFile(filepath, line, (err) => {
        if (err) {
            console.error("Lỗi ghi file:", err);
            return res.status(500).send("Save failed");
        }
        res.send("OK");
    });
});

// API để web lấy dữ liệu
app.get("/data/:station", (req, res) => {
    const filepath = path.join(dataDir, `${req.params.station}.txt`);

    if (!fs.existsSync(filepath)) {
        return res.status(404).send("Station not found");
    }

    fs.readFile(filepath, "utf8", (err, content) => {
        if (err) return res.status(500).send("Read failed");
        res.send(content);
    });
});

// Port Render
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
