import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import express, { Request, Response } from 'express';

// Make sure the uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create a subdirectory for weight photos
const WEIGHT_PHOTOS_DIR = path.join(UPLOADS_DIR, 'weight-photos');
if (!fs.existsSync(WEIGHT_PHOTOS_DIR)) {
  fs.mkdirSync(WEIGHT_PHOTOS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, WEIGHT_PHOTOS_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    // Generate a unique filename with uuid
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${userId}_${uniqueId}${extension}`);
  }
});

// Create the multer upload middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Setup file upload routes
export function setupFileUploadRoutes(app: Express) {
  // Single file upload endpoint
  app.post('/api/upload/weight-photo', ensureAuthenticated, upload.single('photo'), (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Return the file path
      const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      return res.status(200).json({
        message: 'File uploaded successfully',
        filePath: `/${relativePath}`,
        filename: file.filename
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ message: 'File upload failed', error: error.message });
    }
  });

  // Create a route to serve the uploaded files
  app.use('/uploads', ensureAuthenticated, (req, res, next) => {
    // Optional: Add additional security checks here if needed
    next();
  }, express.static(UPLOADS_DIR));
}

export const uploadWeightPhotoMiddleware = upload.single('photo');