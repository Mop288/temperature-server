<<<<<<< HEAD
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

=======
const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Đọc và parse dữ liệu từ file
function readTemperatureData() {
    try {
        const data = fs.readFileSync("temperature.txt", "utf8");
        const lines = data.split("\n").filter(line => line.trim());
        const records = [];
        
        for (const line of lines) {
            // Xử lý trường hợp dòng bị nối liền (không có newline)
            // Tách các bản ghi nếu có nhiều bản ghi trong một dòng
            let linesToProcess = [line];
            
            // Kiểm tra xem có nhiều bản ghi trong một dòng không (có pattern date lặp lại)
            const datePattern = /\d+\/\d+\/\d+/g;
            const dates = line.match(datePattern);
            if (dates && dates.length > 1) {
                // Tách dòng thành nhiều bản ghi
                const parts = line.split(/(?=\d+\/\d+\/\d+)/);
                linesToProcess = parts.filter(p => p.trim());
            }
            
            for (const processLine of linesToProcess) {
                // Xử lý format mới: tab-separated (11/27/2025	Tram1	24	54.7)
                if (processLine.includes("\t")) {
                    const parts = processLine.split("\t");
                    if (parts.length >= 4) {
                        const hour = parseInt(parts[2]);
                        const temp = parseFloat(parts[3]);
                        if (!isNaN(hour) && !isNaN(temp)) {
                            records.push({
                                date: parts[0],
                                station: parts[1],
                                hour: hour,
                                temp: temp
                            });
                        }
                    }
                } 
                // Xử lý format cũ: space-separated với "temp:" (11/27/2025 20 Tram2 temp: 52.6)
                else if (processLine.includes("temp:")) {
                    const match = processLine.match(/(\d+\/\d+\/\d+)\s+(\d+)\s+(Tram[12])\s+temp:\s+([\d.]+)/);
                    if (match) {
                        records.push({
                            date: match[1],
                            station: match[3],
                            hour: parseInt(match[2]),
                            temp: parseFloat(match[4])
                        });
                    }
                }
            }
        }
        
        return records;
    } catch (err) {
        console.error("Lỗi đọc file:", err);
        return [];
    }
}

// Tìm nhiệt độ ngày hôm qua cùng giờ
function findYesterdayTemp(stationName, currentHour) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayDate = `${yesterday.getMonth()+1}/${yesterday.getDate()}/${yesterday.getFullYear()}`;
    
    const records = readTemperatureData();
    
    // Tìm bản ghi ngày hôm qua cùng giờ và cùng trạm
    const yesterdayRecord = records.find(r => 
        r.date === yesterdayDate && 
        r.station === stationName && 
        r.hour === currentHour
    );
    
    return yesterdayRecord ? yesterdayRecord.temp : null;
}

// Tính nhiệt độ trung bình của một tháng cho một trạm
function getMonthlyAverage(stationName, month, year) {
    const records = readTemperatureData();
    
    // Lọc dữ liệu theo tháng và trạm
    const monthRecords = records.filter(r => {
        const dateParts = r.date.split('/');
        const recordMonth = parseInt(dateParts[0]);
        const recordYear = parseInt(dateParts[2]);
        return recordMonth === month && 
               recordYear === year && 
               r.station === stationName;
    });
    
    if (monthRecords.length === 0) {
        return null;
    }
    
    // Tính trung bình
    const sum = monthRecords.reduce((acc, r) => acc + r.temp, 0);
    const average = sum / monthRecords.length;
    
    return parseFloat(average.toFixed(1));
}

// So sánh nhiệt độ trung bình tháng này với tháng trước
function getMonthlyComparison(stationName) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Tính tháng trước
    let lastMonth = currentMonth - 1;
    let lastYear = currentYear;
    if (lastMonth === 0) {
        lastMonth = 12;
        lastYear = currentYear - 1;
    }
    
    const currentAvg = getMonthlyAverage(stationName, currentMonth, currentYear);
    const lastAvg = getMonthlyAverage(stationName, lastMonth, lastYear);
    
    if (currentAvg === null || lastAvg === null) {
        return null;
    }
    
    const diff = parseFloat((currentAvg - lastAvg).toFixed(1));
    
    return {
        currentAvg: currentAvg,
        lastAvg: lastAvg,
        diff: diff,
        isHigher: diff > 0
    };
}

// Lưu dữ liệu dạng: 27/11/2025 1 Tram1 temp: 50.1
function saveTemperature(station, temp) {
    const now = new Date();

    const date = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    const hour = now.getHours() + 1;

    const stationName = station === '1' ? "Tram1" : "Tram2";

    const line = `${date}\t${stationName}\t${hour}\t${temp}\n`;

    fs.appendFile("temperature.txt", line, (err) => {
        if (err) console.error("Lỗi lưu file:", err);
        else console.log("Đã lưu:", line.trim());
    });

    // So sánh với ngày hôm qua
    const yesterdayTemp = findYesterdayTemp(stationName, hour);
    let comparison = null;
    
    if (yesterdayTemp !== null) {
        const diff = parseFloat((temp - yesterdayTemp).toFixed(1));
        comparison = {
            yesterdayTemp: yesterdayTemp,
            diff: diff,
            isHigher: diff > 0
        };
    }

    // So sánh nhiệt độ trung bình tháng (tính lại sau khi có dữ liệu mới)
    const monthlyComparison = getMonthlyComparison(stationName);

    // Gửi realtime cho web
    io.emit("new_temp", {
        time: `${date} ${hour}`,
        station: stationName,
        temp,
        comparison: comparison,
        monthlyComparison: monthlyComparison
    });
}

// Lấy nhiệt độ hiện tại và so sánh cho một trạm
function getCurrentTempAndComparison(stationName) {
    const records = readTemperatureData();
    const now = new Date();
    const todayDate = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    
    // Tìm tất cả bản ghi của trạm hôm nay, giữ lại index gốc
    const todayRecordsWithIndex = records
        .map((r, index) => ({ ...r, originalIndex: index }))
        .filter(r => 
            r.date === todayDate && 
            r.station === stationName
        );
    
    if (todayRecordsWithIndex.length === 0) {
        console.log(`Không tìm thấy dữ liệu hôm nay cho ${stationName}`);
        return null;
    }
    
    // Sắp xếp: ưu tiên giờ lớn hơn, nếu cùng giờ thì lấy bản ghi có index lớn hơn (mới hơn trong file)
    todayRecordsWithIndex.sort((a, b) => {
        if (a.hour !== b.hour) {
            return b.hour - a.hour; // Giờ lớn hơn trước
        }
        return b.originalIndex - a.originalIndex; // Index lớn hơn (mới hơn) trước
    });
    
    const latestRecord = todayRecordsWithIndex[0];
    
    // So sánh với ngày hôm qua cùng giờ
    const yesterdayTemp = findYesterdayTemp(stationName, latestRecord.hour);
    let comparison = null;
    
    if (yesterdayTemp !== null) {
        const diff = parseFloat((latestRecord.temp - yesterdayTemp).toFixed(1));
        comparison = {
            yesterdayTemp: yesterdayTemp,
            diff: diff,
            isHigher: diff > 0
        };
    } else {
        console.log(`Không tìm thấy dữ liệu ngày hôm qua cho ${stationName} giờ ${latestRecord.hour}`);
    }
    
    // So sánh nhiệt độ trung bình tháng
    const monthlyComparison = getMonthlyComparison(stationName);
    
    return {
        temp: latestRecord.temp,
        time: `${latestRecord.date} ${latestRecord.hour}`,
        comparison: comparison,
        monthlyComparison: monthlyComparison
    };
}

// Route lấy dữ liệu hiện tại cho cả hai trạm
app.get('/api/current-temps', (req, res) => {
    const tram1 = getCurrentTempAndComparison("Tram1");
    const tram2 = getCurrentTempAndComparison("Tram2");
    
    res.json({
        tram1: tram1,
        tram2: tram2
    });
});

// Route nhận dữ liệu từ ESP/Postman
app.post('/temperature/:station', (req, res) => {
    const station = req.params.station;
    let temp = req.body.Temp ?? req.body.temp;

    if (temp === undefined) {
        return res.status(400).send("Thiếu Temp");
    }

    saveTemperature(station, temp);

    res.send(`Đã nhận trạm ${station}: ${temp}`);
});

// Start
server.listen(PORT, () => {
    console.log("Server chạy tại http://localhost:" + PORT);
});
>>>>>>> d76493116050a0b15fc70b2c05d53273ae502b9d
