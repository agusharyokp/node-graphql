const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { isEmail } = require("validator");
const jwt = require("jsonwebtoken");
const Post = require("../models/post");

const dotenv = require("dotenv");
dotenv.config();


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
        console.log("triggered");

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
            console.log(user._id);
            const post = new Post({
                title: postInput.title,
                content: postInput.content,
                imageUrl: '/dummy.jpg',
                creator: user
            });
            

            const createdPost = await post.save();
            user.posts.push(createdPost);
            await user.save();

            console.log(createdPost);

            return { 
                ...createdPost._doc, 
                _id: createdPost._id.toString(), 
                createdAt: createdPost.createdAt.toISOString(), 
                updatedAt: createdPost.updatedAt.toISOString()
            };
        } catch (error) {
            console.log(error);
            const err = new Error("Creating post failed!");
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


        try {
            const totalPosts = await Post.find().countDocuments();
            const posts = await Post.find()
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
            console.log(error);
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
            console.log(error);
            const err = new Error("Deleting post failed!");
            err.code = 500;
            throw err;
        }
    },

    updatePost: async ({ id, postInput }, req) => {

        console.log("triggered");
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
            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error("Not authorized!");
                error.code = 403;
                throw error;
            }
            post.title = postInput.title;
            post.content = postInput.content;
            post.imageUrl = '/dummy.jpg';

            console.log(post);
            await post.save();

            return { 
                ...post._doc, 
                _id: post._id.toString(), 
                createdAt: post.createdAt.toISOString(), 
                updatedAt: post.updatedAt.toISOString()
            };
        } catch (error) {
            console.log(error);
            const err = new Error("Editing post failed!");
            err.code = 500;
            throw err;
        }
    }
}

