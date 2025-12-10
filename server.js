const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Auto tạo thư mục data nếu chưa có
const dataFolder = path.join(__dirname, "data");
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
}

// API nhận dữ liệu nhiệt độ
app.post("/temperature/:station", (req, res) => {
    const station = req.params.station;
    const value = req.body.value;

    if (value === undefined) {
        return res.status(400).json({ error: "Thiếu value" });
    }

    const timestamp = new Date().toISOString();
    const filename = path.join(dataFolder, `station_${station}.txt`);
    const line = `${timestamp} - ${value}°C\n`;

    fs.appendFile(filename, line, (err) => {
        if (err) {
            console.error("Lỗi ghi file:", err);
            return res.status(500).send("Không ghi file được");
        }

        console.log(`Đã lưu -> ${filename}: ${line.trim()}`);
        res.json({ message: "OK", station, value });
    });
});

// API xem dữ liệu của 1 trạm
app.get("/temperature/:station", (req, res) => {
    const station = req.params.station;
    const filename = path.join(dataFolder, `station_${station}.txt`);

    if (!fs.existsSync(filename)) {
        return res.json({ station, data: [] });
    }

    fs.readFile(filename, "utf8", (err, data) => {
        if (err) {
            return res.status(500).send("Lỗi đọc file");
        }

        const lines = data.trim().split("\n");
        res.json({ station, data: lines });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server đang chạy trên port " + PORT);
});

