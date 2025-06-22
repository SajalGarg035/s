const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Middleware to verify JWT token
const authenticateToken = passport.authenticate('jwt', { session: false });

// @route   POST /api/auth/signup
// @desc    Register user
// @access  Public
router.post('/signup', [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            provider: 'local',
            lastLogin: new Date()
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.toJSON()
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, [
    body('username').optional().isLength({ min: 3 }).trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('bio').optional().isLength({ max: 500 }).trim().escape(),
    body('location').optional().isLength({ max: 100 }).trim().escape(),
    body('website').optional().isURL()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, bio, location, website, company, jobTitle, skills, socialLinks } = req.body;
        const userId = req.user._id;

        // Check if username or email already exists (excluding current user)
        if (username || email) {
            const existingUser = await User.findOne({
                _id: { $ne: userId },
                $or: [
                    ...(username ? [{ username }] : []),
                    ...(email ? [{ email }] : [])
                ]
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }
        }

        // Update user
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (website !== undefined) updateData.website = website;
        if (company !== undefined) updateData.company = company;
        if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
        if (skills !== undefined) updateData.skills = skills;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /auth/google (Alternative route)
// @desc    Google OAuth
// @access  Public
router.get('/google', (req, res, next) => {
    console.log('🔐 Initiating Google OAuth...');
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })(req, res, next);
});

// @route   GET /auth/google/callback (Alternative route)
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', (req, res, next) => {
    console.log('📧 Google OAuth callback received');
    
    passport.authenticate('google', (err, user, info) => {
        if (err) {
            console.error('🔥 Google OAuth error:', err);
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_error`);
        }
        
        if (!user) {
            console.error('🔥 Google OAuth failed - no user');
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        }

        try {
            const token = generateToken(user._id);
            const frontendURL = process.env.CLIENT_URL || 'http://localhost:3000';
            
            console.log('✅ Google OAuth successful for user:', user.email);
            res.redirect(`${frontendURL}/auth/success?token=${token}`);
        } catch (error) {
            console.error('🔥 Token generation error:', error);
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=token_error`);
        }
    })(req, res, next);
});

// @route   GET /auth/github (Alternative route)
// @desc    GitHub OAuth
// @access  Public
router.get('/github', (req, res, next) => {
    console.log('🔐 Initiating GitHub OAuth...');
    passport.authenticate('github', {
        scope: ['user:email']
    })(req, res, next);
});

// @route   GET /auth/github/callback (Alternative route)
// @desc    GitHub OAuth callback
// @access  Public
router.get('/github/callback', (req, res, next) => {
    console.log('🐙 GitHub OAuth callback received');
    
    passport.authenticate('github', (err, user, info) => {
        if (err) {
            console.error('🔥 GitHub OAuth error:', err);
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_error`);
        }
        
        if (!user) {
            console.error('🔥 GitHub OAuth failed - no user');
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        }

        try {
            const token = generateToken(user._id);
            const frontendURL = process.env.CLIENT_URL || 'http://localhost:3000';
            
            console.log('✅ GitHub OAuth successful for user:', user.username);
            res.redirect(`${frontendURL}/auth/success?token=${token}`);
        } catch (error) {
            console.error('🔥 Token generation error:', error);
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=token_error`);
        }
    })(req, res, next);
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', (req, res) => {
    req.logout(() => {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
});

module.exports = router;
