const User = require("../models/user");
const bcrypt = require("bcryptjs");

module.exports = {
    createUser: async ({ userInput }, req) => {
        const existingUser = await User.findOne({ email: userInput.email });

        if (existingUser) {
            throw new Error("User exists already!");
        }

        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            password: hashedPassword,
            name: userInput.name,
        });

        const result = await user.save();

        return { ...result._doc, id: result._id.toString() };
    }
}