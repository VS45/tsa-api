const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// All routes require authentication
router.use(adminAuth);

// Product routes
router.post('/', upload.array('images', 10), productController.createProduct);
router.get('/', productController.getUserProducts);
router.get('/stats', productController.getProductStats);
router.get('/:productId', productController.getProductById);
router.put('/:productId', upload.array('images', 10), productController.updateProduct);
router.delete('/:productId', productController.deleteProduct);
router.patch('/:productId/stock', productController.updateStock);
router.patch('/:productId/status', productController.updateStatus);
router.post('/:productId/images', upload.array('images', 10), productController.uploadImages);
router.delete('/:productId/images/:imageId', productController.deleteImage);

// Category routes
router.get('/category/all', categoryController.getCategories);
router.get('/category/tree', categoryController.getCategoryTree);
router.get('/category/:categoryId', categoryController.getCategoryById);

// Admin only routes
router.post('/category', categoryController.createCategory);
router.put('/category/:categoryId', categoryController.updateCategory);
router.delete('/category/:categoryId', categoryController.deleteCategory);

module.exports = router;