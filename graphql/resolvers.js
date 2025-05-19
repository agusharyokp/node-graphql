const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { isEmail } = require("validator");
const jwt = require("jsonwebtoken");

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
    }
}