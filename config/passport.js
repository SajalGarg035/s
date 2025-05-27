const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// JWT Strategy
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret'
}, async (payload, done) => {
    try {
        const user = await User.findById(payload.id);
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    } catch (error) {
        console.error('JWT Strategy error:', error);
        return done(error, false);
    }
}));
function generateUniqueUsername(baseInput) {
    const cleanInput = baseInput.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanInput}_${timestamp}`;
}
// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let existingUser = await User.findOne({ 
                providerId: profile.id, 
                provider: 'google' 
            });

            if (existingUser) {
                existingUser.lastLogin = new Date();
                await existingUser.save();
                return done(null, existingUser);
            }

            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(new Error('No email found in Google profile'), null);
            }

            existingUser = await User.findOne({ email });

            if (existingUser) {
                existingUser.provider = 'google';
                existingUser.providerId = profile.id;
                existingUser.profilePicture = profile.photos?.[0]?.value;
                existingUser.lastLogin = new Date();
                existingUser.isVerified = true;
                await existingUser.save();
                return done(null, existingUser);
            }

            const displayName = profile.displayName || '';
            const givenName = profile.name?.givenName || '';
            const emailUsername = email.split('@')[0] || '';

            let baseUsername = displayName || givenName || emailUsername || 'googleuser';

            if (!baseUsername || baseUsername.trim() === '') {
                baseUsername = `google_user_${profile.id}`;
            }

            const uniqueUsername = await generateUniqueUsername(email);

            if (!uniqueUsername || uniqueUsername.trim() === '') {
                const fallbackUsername = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newUserData = {
                    username: fallbackUsername,
                    email,
                    provider: 'google',
                    providerId: profile.id,
                    profilePicture: profile.photos?.[0]?.value,
                    isVerified: true,
                    lastLogin: new Date()
                };

                const newUser = new User(newUserData);
                await newUser.save();

                return done(null, newUser);
            }

            const newUserData = {
                username: uniqueUsername,
                email,
                provider: 'google',
                providerId: profile.id,
                profilePicture: profile.photos?.[0]?.value,
                isVerified: true,
                lastLogin: new Date()
            };

            const newUser = new User(newUserData);
            const validationResult = newUser.validateSync();
            if (validationResult) {
                return done(validationResult, null);
            }

            await newUser.save();

            return done(null, newUser);
        } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error, null);
        }
    }));
} else {
    console.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/auth/github/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🐙 GitHub OAuth profile received:', profile.username);
            
            let existingUser = await User.findOne({ 
                providerId: profile.id, 
                provider: 'github' 
            });

            if (existingUser) {
                existingUser.lastLogin = new Date();
                await existingUser.save();
                console.log('✅ Existing GitHub user logged in:', existingUser.username);
                return done(null, existingUser);
            }

            const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
            existingUser = await User.findOne({ email });

            if (existingUser) {
                existingUser.provider = 'github';
                existingUser.providerId = profile.id;
                existingUser.profilePicture = profile.photos?.[0]?.value;
                existingUser.lastLogin = new Date();
                existingUser.isVerified = true;
                await existingUser.save();
                console.log('✅ Linked GitHub account to existing user:', existingUser.email);
                return done(null, existingUser);
            }

            const baseUsername = profile.username || profile.displayName || email.split('@')[0] || 'githubuser';
            const uniqueUsername = generateUniqueUsername(baseUsername);

            console.log('🔄 Creating new GitHub user with username:', uniqueUsername);

            if (!uniqueUsername) {
                throw new Error('Failed to generate username');
            }

            const newUser = new User({
                username: uniqueUsername,
                email,
                provider: 'github',
                providerId: profile.id,
                profilePicture: profile.photos?.[0]?.value,
                isVerified: true,
                lastLogin: new Date()
            });

            await newUser.save();
            console.log('✅ New GitHub user created:', newUser.username);
            return done(null, newUser);
        } catch (error) {
            console.error('🔥 GitHub OAuth error:', error);
            return done(error, null);
        }
    }));
} else {
    console.warn('⚠️ GitHub OAuth not configured - missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
}

// Serialize/Deserialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Deserialize user error:', error);
        done(error, null);
    }
});
