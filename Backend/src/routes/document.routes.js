import { Router } from 'express';
import * as documentController from '../controllers/document/document.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadSingleDocument, handleUploadError } from '../middleware/upload.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/', uploadSingleDocument, handleUploadError, documentController.uploadDocument);
router.get('/', documentController.getUserDocuments);
router.get('/:documentId', documentController.getDocumentById);
router.delete('/:documentId', documentController.deleteDocument);

// Admin routes
router.get('/admin/pending', authorize(USER_ROLES.ADMIN), documentController.getPendingDocuments);
router.patch('/:documentId/verify', authorize(USER_ROLES.ADMIN), documentController.verifyDocument);
router.patch('/:documentId/reject', authorize(USER_ROLES.ADMIN), documentController.rejectDocument);

export default router;
