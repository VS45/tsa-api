const Category = require('../models/Category');

class CategoryController {
  // Get all categories
  async getCategories(req, res) {
    try {
      const { type, parent, active = true } = req.query;

      // Build query
      const query = {};
      if (type) query.type = { $in: [type, 'Both'] };
      if (parent !== undefined) {
        if (parent === 'null' || parent === '') {
          query.parentCategory = null;
        } else {
          query.parentCategory = parent;
        }
      }
      if (active !== undefined) query.isActive = active === 'true';

      const categories = await Category.find(query)
        .sort({ order: 1, title: 1 })
        .lean();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }

  // Create category (admin only)
  async createCategory(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const { title, description, type, parentCategory, icon, color, order } = req.body;

      if (!title || !type) {
        return res.status(400).json({
          success: false,
          message: 'Title and type are required'
        });
      }

      // Check if category already exists
      const existingCategory = await Category.findOne({ 
        title: new RegExp(`^${title}$`, 'i') 
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category already exists'
        });
      }

      // Validate parent category if provided
      if (parentCategory) {
        const parent = await Category.findById(parentCategory);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: 'Parent category not found'
          });
        }
      }

      const category = await Category.create({
        title,
        description,
        type,
        parentCategory: parentCategory || null,
        icon,
        color: color || '#666666',
        order: order || 0,
        isActive: true
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }
  }

  // Update category (admin only)
  async updateCategory(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const { categoryId } = req.params;
      const updates = req.body;

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if title is being changed and already exists
      if (updates.title && updates.title !== category.title) {
        const existingCategory = await Category.findOne({ 
          title: new RegExp(`^${updates.title}$`, 'i'),
          _id: { $ne: categoryId }
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Category title already exists'
          });
        }
      }

      // Validate parent category if being changed
      if (updates.parentCategory !== undefined) {
        if (updates.parentCategory) {
          if (updates.parentCategory === categoryId.toString()) {
            return res.status(400).json({
              success: false,
              message: 'Category cannot be its own parent'
            });
          }

          const parent = await Category.findById(updates.parentCategory);
          if (!parent) {
            return res.status(404).json({
              success: false,
              message: 'Parent category not found'
            });
          }
        }
      }

      Object.keys(updates).forEach(key => {
        if (key !== '_id') {
          category[key] = updates[key];
        }
      });

      await category.save();

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category'
      });
    }
  }

  // Delete category (admin only)
  async deleteCategory(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const { categoryId } = req.params;

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category has products
      const Product = require('../models/Product');
      const productCount = await Product.countDocuments({ category: categoryId });
      
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing products'
        });
      }

      // Check if category has subcategories
      const childCount = await Category.countDocuments({ parentCategory: categoryId });
      if (childCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with subcategories'
        });
      }

      await Category.findByIdAndDelete(categoryId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category'
      });
    }
  }

  // Get category tree (nested structure)
  async getCategoryTree(req, res) {
    try {
      const { type } = req.query;

      // Build query
      const query = { isActive: true };
      if (type) query.type = { $in: [type, 'Both'] };

      const categories = await Category.find(query)
        .sort({ order: 1, title: 1 })
        .lean();

      // Build tree structure
      const buildTree = (parentId = null) => {
        return categories
          .filter(category => 
            (category.parentCategory && category.parentCategory.toString()) === parentId ||
            (!category.parentCategory && parentId === null)
          )
          .map(category => ({
            ...category,
            children: buildTree(category._id.toString())
          }));
      };

      const tree = buildTree();

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('Get category tree error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category tree'
      });
    }
  }

  // Get category by ID
  async getCategoryById(req, res) {
    try {
      const { categoryId } = req.params;

      const category = await Category.findById(categoryId)
        .populate('parentCategory', 'title')
        .lean();

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Get child categories
      const children = await Category.find({ 
        parentCategory: categoryId,
        isActive: true 
      }).lean();

      // Get product count
      const Product = require('../models/Product');
      const productCount = await Product.countDocuments({ 
        category: categoryId,
        status: 'active'
      });

      res.json({
        success: true,
        data: {
          ...category,
          children,
          productCount
        }
      });
    } catch (error) {
      console.error('Get category by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category'
      });
    }
  }
}

module.exports = new CategoryController();