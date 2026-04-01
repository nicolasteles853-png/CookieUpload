const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadDir = path.join(__dirname, 'Uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch(e){}
app.use('/Uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, timestamp + "-" + cleanName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false });

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = protocol + "://" + host;

        const fileUrl = baseUrl + "/Uploads/" + req.file.filename;

        res.json({
            success: true,
            file: {
                url: fileUrl,
                name: req.file.filename
            }
        });

    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/files', (req, res) => {
    try {
        fs.readdir(uploadDir, (err, files) => {
            if (err) return res.json({ success: true, files: [] });

            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.get('host');
            const baseUrl = protocol + "://" + host;

            const list = files.map(f => ({
                name: f,
                url: baseUrl + "/Uploads/" + f
            }));

            res.json({ success: true, files: list });
        });
    } catch (e) {
        res.json({ success: true, files: [] });
    }
});

app.delete('/delete/:filename', (req, res) => {
    res.status(403).json({ success: false });
});

app.use((err, req, res, next) => {
    res.status(500).json({ success: false });
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT);
}
