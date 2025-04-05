const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS for your frontend
app.use(cors({
  origin: ['https://your-github-username.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST']
}));

// Configure storage for Render's ephemeral filesystem
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'temp-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|ogg|zip|rar|7z/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only media and archive files are allowed!'));
    }
  }
});

// File upload endpoint
app.post('/upload', upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      url: `https://file-upload-backend-3rc9.onrender.com/temp-uploads/${file.filename}`,
      type: path.extname(file.originalname).substring(1).toLowerCase()
    }));

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
  const uploadDir = path.join(__dirname, 'temp-uploads');
  
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading upload directory:', err);
      return res.json([]);
    }

    const fileList = files.map(file => ({
      name: file,
      url: `https://file-upload-backend-3rc9.onrender.com/temp-uploads/${file}`,
      type: path.extname(file).substring(1).toLowerCase()
    }));

    res.json(fileList);
  });
});

// Serve static files
app.use('/temp-uploads', express.static(path.join(__dirname, 'temp-uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on https://file-upload-backend-3rc9.onrender.com`);
});