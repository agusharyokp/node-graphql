const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { isEmail } = require("validator");
const jwt = require("jsonwebtoken");
const Post = require("../models/post");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dotenv = require("dotenv");
dotenv.config();

const processBase64Image = async (base64Data) => {
    try {
        // Extract base64 data (remove data:image/jpeg;base64, prefix)
        const base64Image = base64Data.split(',')[1];
        
        if (!base64Image) {
            throw new Error('Invalid base64 format');
        }
        
        // Generate unique filename
        const filename = crypto.randomBytes(16).toString('hex') + '.jpg';
        const filepath = path.join(__dirname, '../images', filename);
        
        // Decode base64 to buffer
        const buffer = Buffer.from(base64Image, 'base64');
        
        // Validate image size
        if (buffer.length > 1000000) { // 1MB limit
            throw new Error('Image too large');
        }
        
        // Create directory if it doesn't exist
        await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
        
        // Write image to file
        await fs.promises.writeFile(filepath, buffer);
        
        // Return the relative path
        return `/images/${filename}`;
    } catch (error) {
        throw new Error('Error processing image: ' + error.message);
    }
};

const deleteFile = (filePath) => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => {
        if (err) {
            throw err;
        }
    });
};

module.exports = {
    createUser: async ({ userInput }, req) => {
        const errors = [];
        if (!userInput.email || !userInput.password || !userInput.name) {
            errors.push("Email, password, and name are required!");
        }
        if (userInput.email && !isEmail(userInput.email)) {
            errors.push("Please provide a valid email address!");
        }
        if (userInput.password && userInput.password.length < 6) {
            errors.push("Password must be at least 6 characters long!");
        }
        if (errors.length > 0) {
           const error = new Error("Invalid input.");
           error.data = errors;
           error.code = 422;
           throw error;
        }

        const existingUser = await User.findOne({ email: userInput.email });
        if (existingUser) {
            const error = new Error("User exists already!");
            error.code = 401;
            throw error;            
        }

        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            password: hashedPassword,
            name: userInput.name,
        });

        const result = await user.save();

        return { ...result._doc, id: result._id.toString() };
    },

    login: async ({ email, password }) => {
        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Password is incorrect!");
            error.code = 401;
            throw error;
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        return { userId: user._id.toString(), token: token };
    },

    createPost: async ({ postInput }, req) => {

        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        const errors = [];
        if (!postInput.title || !postInput.content) {
            errors.push("Title and content are required!");
        }
        if (postInput.title.length < 5) {
            errors.push("Title must be at least 5 characters long!");
        }
        if (postInput.content.length < 5) {
            errors.push("Content must be at least 5 characters long!");
        }

        if (postInput.imageUrl) {
            try {
                postInput.imageUrl = await processBase64Image(postInput.imageUrl);
            } catch (error) {
                errors.push(error.message);
            }
        }

        if (errors.length > 0) {
            const error = new Error("Invalid input.");
            error.data = errors;
            error.code = 422;
            throw error;
        }

       
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 404;
            throw error;
        }

        try {
            const post = new Post({
                title: postInput.title,
                content: postInput.content,
                imageUrl: postInput.imageUrl,
                creator: user
            });
            

            const createdPost = await post.save();
            user.posts.push(createdPost);
            await user.save();

            return { 
                ...createdPost._doc, 
                _id: createdPost._id.toString(), 
                createdAt: createdPost.createdAt.toISOString(), 
                updatedAt: createdPost.updatedAt.toISOString()
            };
        } catch (error) {;
            const err = new Error(error.message);
            err.code = 500;
            throw err;
        }
    },

    posts: async (args, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        const page = args.page || 1;
        const pageSize = args.pageSize || 10;

        try {
            const totalPosts = await Post.find().countDocuments();
            const posts = await Post.find()
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .sort({ createdAt: -1 })
                .populate("creator");

            return { posts: posts.map(post => {
                return {
                    ...post._doc,
                    _id: post._id.toString(),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString()
                };
            }), totalPosts: totalPosts };
        } catch (error) {
            const err = new Error("Fetching posts failed!");
            err.code = 500;
            throw err;
        }
    },

    deletePost: async ({ id }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        try {
            const post = await Post.findById(id);
            if (!post) {
                const error = new Error("Post not found!");
                error.code = 404;
                throw error;
            }

            if (post.imageUrl) {
                deleteFile(post.imageUrl);
            }
            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error("Not authorized!");
                error.code = 403;
                throw error;
            }
            await post.deleteOne();
            const user = await User.findById(req.userId);
            user.posts.pull(id);
            await user.save();

            return true;
        } catch (error) {
            const err = new Error("Deleting post failed!");
            err.code = 500;
            throw err;
        }
    },

    updatePost: async ({ id, postInput }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!!!");
            error.code = 401;
            throw error;
        }

        try {
            const post = await Post.findById(id);
            if (!post) {
                const error = new Error("Post not found!");
                error.code = 404;
                throw error;
            }
            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error("Not authorized!");
                error.code = 403;
                throw error;
            }
            if (postInput.imageUrl) {
                try {
                    postInput.imageUrl = await processBase64Image(postInput.imageUrl);
                } catch (error) {
                    const err = new Error("Invalid image!");
                    err.code = 422;
                    throw err;
                }
            }
            post.title = postInput.title;
            post.content = postInput.content;

            if (postInput.imageUrl && post.imageUrl !== postInput.imageUrl) {
                deleteFile(post.imageUrl);
                post.imageUrl = postInput.imageUrl;
            }

            await post.save();

            return { 
                ...post._doc, 
                _id: post._id.toString(), 
                createdAt: post.createdAt.toISOString(), 
                updatedAt: post.updatedAt.toISOString()
            };
        } catch (error) {
            const err = new Error(error.message);
            err.code = error.code;
            throw err;
        }
    },

    post: async ({ id }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        try {
            const baseUrl = req.get("origin") || "http://localhost:8080";
            const post = await Post.findById(id);
            if (!post) {
                const error = new Error("Post not found!");
                error.code = 404;
                throw error;
            }
            post.imageUrl = baseUrl + post.imageUrl;
            return {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString()
            };
        } catch (error) {
            const err = new Error("Fetching post failed!");
            err.code = 500;
            throw err;
        }
    },

    updateStatus: async ({ status }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!");
            error.code = 401;
            throw error;
        }

        try {
            const user = await User.findById(req.userId);
            if (!user) {
                const error = new Error("User not found!");
                error.code = 404;
                throw error;
            }
            user.status = status;
            await user.save();
            return { ...user._doc, id: user._id.toString() };
        } catch (error) {
            const err = new Error("Updating status failed!");
            err.code = 500;
            throw err;
        }
    }
}

