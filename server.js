const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// PROXY HTTPS (RENDER)
app.set('trust proxy', 1);

// CONFIG BÁSICA
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// GARANTIR PASTA UPLOAD
const uploadDir = path.join(__dirname, 'Uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch(e){}
app.use('/Uploads', express.static(uploadDir));

// CONFIGURAÇÃO DO MULTER
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
    fileFilter: (req, file, cb) => cb(null, true),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// BASE URL SEMPRE HTTPS
function getBaseUrl(req) {
    return 'https://' + req.get('host');
}

// ROTA UPLOAD
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

        const baseUrl = getBaseUrl(req);
        const fileUrl = baseUrl + '/Uploads/' + req.file.filename;

        res.status(200).json({
            success: true,
            message: 'Upload realizado com sucesso',
            file: {
                url: fileUrl
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno', error: error.message });
    }
});

// LISTAR ARQUIVOS
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

// ERROS
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Erro', error: err.message });
});

// START
app.listen(PORT, () => {
    console.log('Rodando em https://localhost:' + PORT);
});
