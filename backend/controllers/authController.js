const User = require('../models/User');
const List = require('../models/List');
const Review = require('../models/Review');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const { publishNotification } = require('../utils/rabbitClient');

// Register
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Lütfen tüm alanları geçerli metin olarak doldurun.' });
        }

        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
            return res.status(400).json({ message: 'Kullanıcı adı 3 ile 30 karakter arasında olmalıdır.' });
        }

        const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
        if (!usernameRegex.test(trimmedUsername)) {
            return res.status(400).json({ message: 'Kullanıcı adı yalnızca harf, rakam, alt çizgi, nokta ve tire içerebilir.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
            return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz.' });
        }

        if (password.length < 6 || password.length > 128) {
            return res.status(400).json({ message: 'Şifre en az 6, en fazla 128 karakter olmalıdır.' });
        }

        let user = await User.findOne({ $or: [{ email: trimmedEmail }, { username: trimmedUsername }] });
        if (user) {
            return res.status(400).json({ message: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username: trimmedUsername,
            email: trimmedEmail,
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
        }

        // Send Welcome Email (Non-blocking response)
        const message = `RateFlix'e hoş geldiniz, ${trimmedUsername}!\n\nHesabınız başarıyla oluşturuldu ve kullanıma hazır. Keyifli seyirler dileriz!`;
        
        try {
            sendEmail({ 
                email: user.email,
                subject: 'RateFlix - Hesabınız Oluşturuldu!',
                message
            }).catch(e => console.error("Welcome email background error:", e));

            publishNotification({
                userId: user._id,
                type: 'SYSTEM',
                message: `RateFlix'e hoş geldiniz, ${trimmedUsername}!`
            });

            return res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });
        } catch (err) {
            publishNotification({
                userId: user._id,
                type: 'SYSTEM',
                message: `RateFlix'e hoş geldiniz, ${trimmedUsername}!`
            });
            return res.status(201).json({ message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });
        }

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: 'Sunucu hatası oluştu' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'E-posta ve şifre zorunludur' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: trimmedEmail });
        if (!user) return res.status(400).json({ message: 'Geçersiz e-posta veya şifre' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Geçersiz e-posta veya şifre' });

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
        const targetEmail = req.user?.email || process.env.EMAIL_USER || 'test@example.com';
        await sendEmail({
            email: targetEmail,
            subject: 'RateFlix Resend Test',
            message: 'Resend entegrasyonu başarıyla tamamlandı!',
            html: '<h1>RateFlix</h1><p>Resend entegrasyonu başarıyla tamamlandı!</p>'
        });
        res.json({ success: true, message: 'Test email sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'E-posta gönderilemedi' });
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
        }).populate('user', 'username profilePic');
        const reviews = await Review.find({ user: user._id })
            .populate('user', 'username profilePic')
            .sort({ createdAt: -1 });

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
        if (!q || typeof q !== 'string') return res.json([]);
        const safeQuery = q.trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!safeQuery) return res.json([]);

        const users = await User.find({ username: { $regex: new RegExp(safeQuery, 'i') } })
            .select('username profilePic role')
            .limit(10);
        res.json(users);
    } catch (err) {
        console.error('searchUsers error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.followUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const currentUserId = req.user.id;

        console.log(`[Social] followUser called: currentUserId=${currentUserId}, targetId=${targetId}`);

        if (currentUserId === targetId) {
            return res.status(400).json({ message: "Kendinizi takip edemezsiniz" });
        }

        if (!mongoose.Types.ObjectId.isValid(targetId) || !mongoose.Types.ObjectId.isValid(currentUserId)) {
            return res.status(400).json({ message: "Geçersiz kullanıcı kimliği" });
        }

        const userToFollow = await User.findById(targetId);
        if (!userToFollow) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }

        // Atomic update - no save() needed, no validation issues
        await User.updateOne(
            { _id: targetId },
            { $addToSet: { followers: new mongoose.Types.ObjectId(currentUserId) } }
        );
        await User.updateOne(
            { _id: currentUserId },
            { $addToSet: { following: new mongoose.Types.ObjectId(targetId) } }
        );

        console.log(`[Social Success] ${currentUserId} followed ${targetId}`);
        return res.json({ message: "Takip edildi" });
    } catch (err) {
        console.error(`[Social Error] followUser:`, err);
        return res.status(500).json({ message: "Sunucu hatası: " + err.message });
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const targetId = req.params.id;
        const currentUserId = req.user.id;

        console.log(`[Social] unfollowUser called: currentUserId=${currentUserId}, targetId=${targetId}`);

        if (currentUserId === targetId) {
            return res.status(400).json({ message: "Kendinizi takipten çıkaramazsınız" });
        }

        if (!mongoose.Types.ObjectId.isValid(targetId) || !mongoose.Types.ObjectId.isValid(currentUserId)) {
            return res.status(400).json({ message: "Geçersiz kullanıcı kimliği" });
        }

        // Atomic update - no save() needed, no validation issues
        await User.updateOne(
            { _id: targetId },
            { $pull: { followers: new mongoose.Types.ObjectId(currentUserId) } }
        );
        await User.updateOne(
            { _id: currentUserId },
            { $pull: { following: new mongoose.Types.ObjectId(targetId) } }
        );

        console.log(`[Social Success] ${currentUserId} unfollowed ${targetId}`);
        return res.json({ message: "Takipten çıkıldı" });
    } catch (err) {
        console.error(`[Social Error] unfollowUser:`, err);
        return res.status(500).json({ message: "Sunucu hatası oluştu" });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz.' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: trimmedEmail });
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
        
        if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ message: 'Geçerli bir token ve en az 6 karakterli şifre giriniz.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
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
