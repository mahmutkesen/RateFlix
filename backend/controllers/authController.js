const User = require('../models/User');
const List = require('../models/List');
const Review = require('../models/Review');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');

// Register
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        user = new User({
            username,
            email,
            password: hashedPassword,
            verificationToken: undefined,
            isVerified: true
        });

        await user.save();

        // Create default lists for the new user immediately to ensure they are available on first login
        const defaultLists = [
            { user: user._id, name: 'İzleyeceklerim', type: 'watchlist', description: 'İzlemeyi planladığım içerikler', isPublic: false },
            { user: user._id, name: 'İzlediklerim', type: 'watched', description: 'Daha önce izlediğim içerikler', isPublic: false },
            { user: user._id, name: 'Favorilerim', type: 'favorites', description: 'En sevdiğim içerikler', isPublic: false }
        ];
        
        try {
            await List.insertMany(defaultLists);
        } catch (listErr) {
            console.error("Default list creation error:", listErr);
            // We continue as user is already created, getUserLists will attempt to restore these later if needed
        }

        // Send Welcome Email (Non-blocking response)
        const message = `RateFlix'e hoş geldiniz, ${username}!\n\nHesabınız başarıyla oluşturuldu ve kullanıma hazır. Keyifli seyirler dileriz!`;
        
        try {
            sendEmail({ 
                email: user.email,
                subject: 'RateFlix - Hesabınız Oluşturuldu!',
                message
            }).catch(e => console.error("Welcome email background error:", e));

            res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });
        } catch (err) {
            res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });
        }

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).send('Server Error');
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        /* Skipping isVerified check for simplified flow */

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ 
                token, 
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    profilePic: user.profilePic
                } 
            });
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).send('Server Error');
    }
};

// Get Me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password')
            .populate('followers', 'username profilePic')
            .populate('following', 'username profilePic');
        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({ verificationToken: hashedToken });
        
        if (!user) return res.status(400).send('Invalid or expired token');

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        // Redirect to frontend login
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.testEmail = async (req, res) => {
    try {
        await sendEmail({
            email: 'kesenmahmut01@gmail.com',
            subject: 'RateFlix Resend Test',
            message: 'Resend entegrasyonu başarıyla tamamlandı!',
            html: '<h1>RateFlix</h1><p>Resend entegrasyonu başarıyla tamamlandı!</p>'
        });
        res.json({ success: true, message: 'Test email sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Profile & Social
exports.getUserProfile = async (req, res) => {
    try {
        let user;
        const idOrUsername = req.params.id;

        // Try by ID first if it looks like a valid ObjectId
        if (idOrUsername.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(idOrUsername).select('-password')
                .populate('followers', 'username profilePic')
                .populate('following', 'username profilePic');
        }

        // Always try by username if ID search didn't yield a result
        if (!user) {
            user = await User.findOne({ username: idOrUsername }).select('-password')
                .populate('followers', 'username profilePic')
                .populate('following', 'username profilePic');
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        // If it's my own profile, show all lists. Otherwise, only public ones.
        const isMyProfile = req.user && req.user.id === user._id.toString();
        const lists = await List.find({ 
            user: user._id, 
            ...(isMyProfile ? {} : { isPublic: true }) 
        });
        const reviews = await Review.find({ user: user._id }).sort({ createdAt: -1 });

        console.log(`[Profile Debug] User: ${user.username}, isMyProfile: ${isMyProfile}, Lists Found: ${lists.length}`);

        res.json({
            user,
            lists,
            reviews
        });
    } catch (err) { 
        console.error(err);
        res.status(500).send('Server Error'); 
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json([]);
        const users = await User.find({ username: { $regex: new RegExp(q, 'i') } })
            .select('username profilePic role')
            .limit(10);
        res.json(users);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.followUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const currentUserId = req.user.id;

        if (currentUserId === targetId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const userToFollow = await User.findById(targetId);
        const currentUser = await User.findById(currentUserId);

        if (!userToFollow || !currentUser) {
            console.error(`[Social Error] User not found during follow: Target ${targetId}, Current ${currentUserId}`);
            return res.status(404).json({ message: "User not found" });
        }

        const isAlreadyFollowing = userToFollow.followers.some(id => id.toString() === currentUserId);
        if (!isAlreadyFollowing) {
            userToFollow.followers.push(new mongoose.Types.ObjectId(currentUserId));
            currentUser.following.push(new mongoose.Types.ObjectId(targetId));
            
            await Promise.all([userToFollow.save(), currentUser.save()]);
            console.log(`[Social Success] ${currentUserId} followed ${targetId}`);
            return res.json({ message: "User followed successfully" });
        } else {
            console.log(`[Social Info] ${currentUserId} already following ${targetId}`);
            return res.status(400).json({ message: "You already follow this user" });
        }
    } catch (err) {
        console.error(`[Social Error] Critical error in followUser:`, err);
        res.status(500).send('Server Error');
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const currentUserId = req.user.id;

        if (currentUserId === targetId) {
            return res.status(400).json({ message: "You cannot unfollow yourself" });
        }
        const userToUnfollow = await User.findById(targetId);
        const currentUser = await User.findById(currentUserId);

        if (!userToUnfollow || !currentUser) {
            console.error(`[Social Error] User not found during unfollow: Target ${targetId}, Current ${currentUserId}`);
            return res.status(404).json({ message: "User not found" });
        }

        const isFollowing = userToUnfollow.followers.some(id => id.toString() === currentUserId);
        if (isFollowing) {
            userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== currentUserId);
            currentUser.following = currentUser.following.filter(id => id.toString() !== targetId);
            
            await Promise.all([userToUnfollow.save(), currentUser.save()]);
            console.log(`[Social Success] ${currentUserId} unfollowed ${targetId}`);
            return res.json({ message: "User unfollowed successfully" });
        } else {
            console.log(`[Social Info] ${currentUserId} not following ${targetId}`);
            return res.status(400).json({ message: "You are not following this user" });
        }
    } catch (err) {
        console.error(`[Social Error] Critical error in unfollowUser:`, err);
        res.status(500).send('Server Error');
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Bu e-posta adresine ait bir kullanıcı bulunamadı.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        const message = `RateFlix şifrenizi sıfırlamak için bir talepte bulundunuz.\n\nLütfen aşağıdaki bağlantıya tıklayarak yeni şifrenizi belirleyin:\n\n${resetUrl}\n\nEğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'RateFlix Şifre Sıfırlama Bağlantısı',
                message
            });
            res.status(200).json({ message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' });
        } catch (err) {
            console.error("Email send error", err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            res.status(500).json({ message: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};
