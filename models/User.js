// models/User.js - User model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Screen 1: Personal Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required']
  },
  country: {
    type: String,
    required: [true, 'Country is required']
  },
  state: String,
  city: String,
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  
  // Profile
  profilePhoto: {
    url: String,
    publicId: String
  },
  referralCode: String,
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Screen 2: Identity Verification Documents
  documents: {
    driversLicense: {
      front: { url: String, publicId: String, verified: Boolean },
      back: { url: String, publicId: String, verified: Boolean }
    },
    nin: {
      front: { url: String, publicId: String, verified: Boolean },
      back: { url: String, publicId: String, verified: Boolean }
    },
    passport: {
      photo: { url: String, publicId: String, verified: Boolean }
    },
    pvc: {
      card: { url: String, publicId: String, verified: Boolean }
    },
    bvn: {
      number: String,
      verified: Boolean,
      verifiedAt: Date
    }
  },
  
  // Screen 3: Facial Verification
  facialVerification: {
    faceFront: { url: String, publicId: String, embeddings: [Number] },
    faceLeft: { url: String, publicId: String, embeddings: [Number] },
    faceRight: { url: String, publicId: String, embeddings: [Number] },
    faceUp: { url: String, publicId: String, embeddings: [Number] },
    faceDown: { url: String, publicId: String, embeddings: [Number] },
    verificationScore: Number,
    verified: Boolean,
    verifiedAt: Date
  },
  
  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationNotes: String,
  
  // Account Status
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },
  
  // Metadata
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

module.exports = mongoose.model('User', userSchema);