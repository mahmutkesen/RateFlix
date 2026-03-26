const List = require('../models/List');
const Comment = require('../models/Comment');

let memLists = []; // Memory mock

exports.getAllPublicLists = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            return res.json(memLists.filter(l => l.isPublic !== false).slice(0, 50));
        }
        const lists = await List.find({ 
            isPublic: true,
            "items.0": { $exists: true } 
        }).sort({ createdAt: -1 }).limit(50).populate('user', 'username profilePic');
        
        const listIds = lists.map(l => l._id);
        const counts = await Comment.aggregate([
            { $match: { targetId: { $in: listIds.map(id => id.toString()) }, targetType: 'list' } },
            { $group: { _id: "$targetId", count: { $sum: 1 } } }
        ]);
        const countsMap = counts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const listsWithCounts = lists.map((l) => {
            let listObj = l.toObject();
            if (!listObj.user) {
                listObj.user = { _id: l.toObject().user, username: 'Silinmiş Kullanıcı', profilePic: '' };
            }
            return { ...listObj, commentCount: countsMap[l._id.toString()] || 0 };
        });
        res.json(listsWithCounts);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.getUserLists = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            return res.json(memLists.filter(l => l.user === req.user.id));
        }
        console.log(`[List Debug] Fetching lists for User ID: ${req.user.id}`);
        let lists = await List.find({ user: req.user.id }).sort({ createdAt: -1 }).populate('user', 'username profilePic');
        
        // Auto-restore missing default lists
        const defaultListTypes = ['watchlist', 'watched', 'favorites'];
        const existingTypes = lists.map(l => l.type);
        const missingTypes = defaultListTypes.filter(t => !existingTypes.includes(t));

        if (missingTypes.length > 0) {
            console.log(`[List Debug] Restoring missing lists: ${missingTypes.join(', ')}`);
            const defaults = {
                'watchlist': { name: 'İzleyeceklerim', description: 'İzlemeyi planladığım içerikler', isPublic: false },
                'watched': { name: 'İzlediklerim', description: 'Daha önce izlediğim içerikler', isPublic: false },
                'favorites': { name: 'Favorilerim', description: 'En sevdiğim içerikler', isPublic: false }
            };
            const newLists = missingTypes.map(type => ({
                user: req.user.id,
                type,
                ...defaults[type]
            }));
            const createdLists = await List.insertMany(newLists);
            // Re-fetch or append to the list
            lists = await List.find({ user: req.user.id }).sort({ createdAt: -1 }).populate('user', 'username profilePic');
        }

        console.log(`[List Debug] Found ${lists.length} lists for user.`);
        res.json(lists);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.getList = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            const list = memLists.find(l => l._id === req.params.id);
            if (!list) return res.status(404).json({ message: 'List not found' });
            if (!list.isPublic && list.user !== req.user?.id) return res.status(403).json({ message: 'Not authorized' });
            return res.json(list);
        }

        const list = await List.findById(req.params.id).populate('user', 'username');
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (!list.isPublic && list.user._id.toString() !== req.user?.id) return res.status(403).json({ message: 'Not authorized' });
        res.json(list);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.createList = async (req, res) => {
    try {
        const { name, description, isPublic, type } = req.body;
        
        if (process.env.USE_MEMORY_DB === 'true') {
            const list = { _id: Date.now().toString(), user: req.user.id, name, description, isPublic: isPublic !== false, type: type || 'custom', items: [], createdAt: new Date() };
            memLists.push(list);
            return res.status(201).json(list);
        }

        const newList = new List({ user: req.user.id, name, description, isPublic, type: type || 'custom' });
        const list = await newList.save();
        res.status(201).json(list);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.addItemToList = async (req, res) => {
    try {
        const { tmdbId, mediaType, posterPath } = req.body;
        
        if (process.env.USE_MEMORY_DB === 'true') {
            const list = memLists.find(l => l._id === req.params.id);
            if (!list) return res.status(404).json({ message: 'List not found' });
            if (list.user !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
            if (list.items.some(item => String(item.tmdbId) === String(tmdbId))) return res.status(400).json({ message: 'Item already in list' });
            list.items.unshift({ tmdbId: String(tmdbId), mediaType, posterPath, addedAt: new Date() });
            return res.json(list);
        }

        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
        if (list.items.some(item => String(item.tmdbId) === String(tmdbId))) return res.status(400).json({ message: 'Item already in list' });
        list.items.unshift({ tmdbId: String(tmdbId), mediaType, posterPath });
        await list.save();
        res.json(list);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.removeItemFromList = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            const list = memLists.find(l => l._id === req.params.id);
            if (!list) return res.status(404).json({ message: 'List not found' });
            if (list.user !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
            list.items = list.items.filter(item => item.tmdbId !== req.params.tmdbId);
            return res.json(list);
        }

        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
        list.items = list.items.filter(item => item.tmdbId !== req.params.tmdbId);
        await list.save();
        res.json(list);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.deleteList = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            const index = memLists.findIndex(l => l._id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'List not found' });
            if (memLists[index].user !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
            if (['favorites', 'watchlist', 'watched'].includes(memLists[index].type)) return res.status(400).json({ message: 'Cannot delete default' });
            memLists.splice(index, 1);
            return res.json({ message: 'List removed' });
        }

        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (list.user.toString() !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
        if (['favorites', 'watchlist', 'watched'].includes(list.type)) return res.status(400).json({ message: 'Cannot delete default lists' });
        await list.deleteOne();
        res.json({ message: 'List removed' });
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.updateList = async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        const list = await List.findById(req.params.id);
        
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        if (name) list.name = name;
        if (description !== undefined) list.description = description;
        if (isPublic !== undefined) list.isPublic = isPublic;

        await list.save();
        res.json(list);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.toggleListLike = async (req, res) => {
    try {
        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });
        const userId = req.user.id;
        const liked = list.likes.map(id => id.toString()).includes(userId);
        if (liked) {
            list.likes = list.likes.filter(id => id.toString() !== userId);
        } else {
            list.likes.push(userId);
            list.dislikes = list.dislikes.filter(id => id.toString() !== userId);
        }
        await list.save();
        res.json({ likes: list.likes.length, dislikes: list.dislikes.length, liked: !liked, disliked: false });
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.toggleListDislike = async (req, res) => {
    try {
        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });
        const userId = req.user.id;
        const disliked = list.dislikes.map(id => id.toString()).includes(userId);
        if (disliked) {
            list.dislikes = list.dislikes.filter(id => id.toString() !== userId);
        } else {
            list.dislikes.push(userId);
            list.likes = list.likes.filter(id => id.toString() !== userId);
        }
        await list.save();
        res.json({ likes: list.likes.length, dislikes: list.dislikes.length, liked: false, disliked: !disliked });
    } catch (err) { res.status(500).send('Server Error'); }
};

