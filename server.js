const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (['.mp3', '.wav', '.ogg'].includes(ext)) {
            uploadPath = path.join(uploadPath, 'audio');
        } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
            uploadPath = path.join(uploadPath, 'video');
        } else if (['.zip', '.rar', '.7z'].includes(ext)) {
            uploadPath = path.join(uploadPath, 'archives');
        }
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const originalName = path.parse(file.originalname).name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const extension = path.extname(file.originalname).toLowerCase();
        let fileName = `${originalName}${extension}`;
        let counter = 1;
        const destination = file.destination || 'uploads';
        
        while (fs.existsSync(path.join(destination, fileName))) {
            fileName = `${originalName}_${counter}${extension}`;
            counter++;
        }
        
        cb(null, fileName);
    }
});

const upload = multer({ storage });

// Handle file upload
app.post('/upload', upload.array('files'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        const uploadedFiles = req.files.map(file => {
            // Fix: Use path.relative to get the correct path
            const relativePath = path.relative('uploads', file.path).replace(/\\/g, '/');
            return {
                name: file.originalname,
                url: `/uploads/${relativePath}`
            };
        });

        res.json({
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Error uploading files' });
    }
});

// Get list of uploaded files
app.get('/files', (req, res) => {
    const getFilesRecursively = (dir) => {
        const files = fs.readdirSync(dir);
        let fileList = [];
        
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                fileList = [...fileList, ...getFilesRecursively(fullPath)];
            } else {
                fileList.push({
                    name: file,
                    url: `/uploads/${path.relative('uploads', fullPath).replace(/\\/g, '/')}`
                });
            }
        });
        
        return fileList;
    };

    try {
        const files = getFilesRecursively('uploads');
        res.json(files);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Unable to scan files' });
    }
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});