const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIG
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MULTER (MEMÓRIA)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// UPLOAD
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false });
    }

    res.json({
        success: true,
        message: "Upload recebido",
        file: {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
        }
    });
});

// FILES (vazio)
app.get('/files', (req, res) => {
    res.json({ success: true, total: 0, files: [] });
});

// DELETE
app.delete('/delete/:filename', (req, res) => {
    res.status(403).json({ success: false });
});

// ERROS
app.use((err, req, res, next) => {
    res.status(500).json({ success: false });
});

// START
app.listen(PORT);
