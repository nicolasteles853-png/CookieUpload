const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIG BÁSICA
app.use(cors());
app.use(express.json({ limit: '10gb' }));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

// GARANTIR PASTA UPLOAD
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/Uploads', express.static(uploadDir));

// CONFIGURAÇÃO DO MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${cleanName}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => cb(null, true),
    limits: { fileSize: Infinity }
});

// ROTA UPLOAD
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

        const baseUrl = `https://${req.get('host')}`;
        const fileUrl = `${baseUrl}/Uploads/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Upload realizado com sucesso',
            timestamp: new Date().toISOString(),
            server: {
                hostname: req.hostname,
                ip: req.ip,
            },
            file: {
                originalName: req.file.originalname,
                savedName: req.file.filename,
                size: req.file.size,
                mimeType: req.file.mimetype,
                url: fileUrl,
                extension: path.extname(req.file.filename),
                uploadedAt: new Date().toLocaleString(),
            },
            meta: {
                environment: process.env.NODE_ENV || 'development',
                port: PORT
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno no servidor', error: error.message });
    }
});

// LISTAR ARQUIVOS
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao listar arquivos' });

        const baseUrl = `https://${req.get('host')}`;
        const fileList = files.map(file => ({ name: file, url: `${baseUrl}/Uploads/${file}` }));

        res.json({ success: true, total: fileList.length, files: fileList });
    });
});

// DELETAR ARQUIVO (DESATIVADO)
app.delete('/delete/:filename', (req, res) => {
    res.status(403).json({ success: false, message: 'Deleção desativada no servidor' });
});

// TRATAMENTO GLOBAL DE ERROS
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Erro inesperado', error: err.message });
});

// START
app.listen(PORT, () => {
    console.log(`Servidor rodando 🚀`);
    console.log(`Arquivos salvos em: ${uploadDir} 📁`);
});
