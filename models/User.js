const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30, 
        default: null
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        minlength: 6
    },
    profilePicture: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: 500,
        default: ''
    },
    location: {
        type: String,
        maxlength: 100,
        default: ''
    },
    website: {
        type: String,
        maxlength: 200,
        default: ''
    },
    company: {
        type: String,
        maxlength: 100,
        default: ''
    },
    jobTitle: {
        type: String,
        maxlength: 100,
        default: ''
    },
    skills: [{
        type: String,
        trim: true
    }],
    socialLinks: {
        github: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        twitter: { type: String, default: '' }
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    providerId: {
        type: String,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    codingSessions: {
        type: Number,
        default: 0
    },
    collaborations: {
        type: Number,
        default: 0
    },
    hoursTracked: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.__v;
    return user;
};

module.exports = mongoose.model('User', userSchema);
