const {buildSchema} = require("graphql");

module.exports = buildSchema(`
    schema {
        query: RootQuery
        mutation: RootMutation
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        login(email: String!, password: String!): AuthData!
        deletePost(id: ID!): Boolean!
        updatePost(id: ID!, postInput: PostInputData): Post!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts: PostData!
    }

    input UserInputData {
        name: String!
        email: String!
        password: String!
    }
    
    input PostInputData {
        title: String!
        content: String!
        imageUrl: String
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

    type PostData {
        posts: [Post!]!
        totalPosts: Int!
    }
`);