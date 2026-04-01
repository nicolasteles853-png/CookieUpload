const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIG BÁSICA
app.use(cors());
app.use(express.json({ limit: '100gb' }));
app.use(express.urlencoded({ extended: true, limit: '100gb' }));

// GARANTIR PASTA LOCAL (para fallback ou testes locais)
const uploadDir = path.join(__dirname, 'Uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch(e){}

// Mantendo rota estática
app.use('/Uploads', express.static(uploadDir));

// CONFIGURAÇÃO MULTER
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, fileFilter: (req, file, cb) => cb(null, true), limits: { fileSize: Infinity } });

// CONFIGURAÇÃO AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// ROTA UPLOAD
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;

        // Envia para S3
        const params = { Bucket: BUCKET_NAME, Key: fileName, Body: req.file.buffer, ContentType: req.file.mimetype };
        const uploadResult = await s3.upload(params).promise();

        res.status(200).json({
            success: true,
            message: 'Upload realizado com sucesso',
            timestamp: new Date().toISOString(),
            server: { hostname: req.hostname, ip: req.ip },
            file: {
                originalName: req.file.originalname,
                savedName: fileName,
                size: req.file.size,
                mimeType: req.file.mimetype,
                url: uploadResult.Location, // <-- URL pública S3
                extension: path.extname(req.file.originalname),
                uploadedAt: new Date().toLocaleString()
            },
            meta: { environment: process.env.NODE_ENV || 'production', port: PORT }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno no servidor', error: error.message });
    }
});

// LISTAR ARQUIVOS
app.get('/files', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME }).promise();
        const fileList = data.Contents.map(f => ({
            name: f.Key,
            url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${f.Key}`
        }));
        res.json({ success: true, total: fileList.length, files: fileList });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao listar arquivos', error: err.message });
    }
});

// DELETAR ARQUIVO (DESATIVADO)
app.delete('/delete/:filename', (req, res) => {
    res.status(403).json({ success: false, message: 'Deleção desativada no servidor' });
});

// TRATAMENTO GLOBAL DE ERROS
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: 'Erro inesperado', error: err.message });
});

// START
app.listen(PORT, () => console.log(`Servidor rodando em https://0.0.0.0:${PORT}`));
