const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '200gb' }));
app.use(express.urlencoded({ extended: true, limit: '200gb' }));

const uploadDir = path.join(__dirname, 'Uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch(e){}
app.use('/Uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, timestamp + '-' + cleanName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 200 * 1024 * 1024 * 1024 }
});

function getBaseUrl(req) {
    return 'https://' + req.get('host');
}

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false });

        const baseUrl = getBaseUrl(req);
        const fileUrl = baseUrl + '/Uploads/' + req.file.filename;

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Upload realizado com sucesso',
            file: {
                name: req.file.originalname,
                saved: req.file.filename,
                size: req.file.size,
                type: req.file.mimetype,
                extension: path.extname(req.file.filename),
                url: fileUrl
            },
            server: {
                host: req.hostname,
                ip: req.ip,
                protocol: 'https'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json({ success: false });

        const baseUrl = getBaseUrl(req);
        const list = [];

        for (let i = 0; i < files.length; i++) {
            list.push({
                name: files[i],
                url: baseUrl + '/Uploads/' + files[i]
            });
        }

        res.json({ success: true, files: list });
    });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
    console.log('Rodando em https://localhost:' + PORT);
});
