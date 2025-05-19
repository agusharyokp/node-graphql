const {buildSchema} = require("graphql");

module.exports = buildSchema(`
    schema {
        query: RootQuery
        mutation: RootMutation
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        login(email: String!, password: String!): AuthData!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
    }

    input UserInputData {
        name: String!
        email: String!
        password: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type AuthData {
        userId: ID!
        token: String!
    }

    type Post {
        _id: ID!
        title: String!
        content: String!
        creator: User!
        imageUrl: String!
        createdAt: String!
    }
`);