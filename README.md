# Node.js GraphQL API

A full-featured GraphQL API built with Node.js, Express, and MongoDB. This project provides a robust backend for managing users and posts with authentication and file upload capabilities.

## Project Overview

This is a RESTful GraphQL API that provides endpoints for user authentication, post management, and file uploads. The API is built using modern Node.js technologies and follows best practices for security and scalability.

## Features

- User authentication (login/register)
- Post creation, reading, updating, and deletion
- File upload support (images)
- JWT-based authentication
- CORS support
- Error handling middleware

## Requirements

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd node-graphql
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. Start the server:
   ```bash
   npm start
   # or
   yarn start
   ```

The server will start on `http://localhost:8080`

## Dependencies

- express: ^4.18.2
- graphql: ^16.6.0
- express-graphql: ^0.12.0
- mongoose: ^7.0.0
- multer: ^1.4.5-lts.1
- dotenv: ^16.0.3
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.0

## GraphQL Queries

### Get Posts
```graphql
query {
  posts {
    _id
    title
    content
    imageUrl
    creator {
      name
      email
    }
  }
}
```

### Login
```graphql
query {
  login(email: "user@example.com", password: "password") {
    userId
    token
  }
}
```

## GraphQL Mutations

### Create User
```graphql
mutation {
  createUser(userInput: {
    name: "John Doe",
    email: "john@example.com",
    password: "password123"
  }) {
    _id
    name
    email
  }
}
```

### Create Post
```graphql
mutation {
  createPost(postInput: {
    title: "Sample Post",
    content: "This is a sample post",
    imageUrl: "data:image/jpg;base64," + "base64"
  }) {
    _id
    title
    content
  }
}
```

### Update Post
```graphql
mutation {
  updatePost(id: "post-id", postInput: {
    title: "Updated Title",
    content: "Updated content"
    imageUrl: "data:image/jpg;base64," + "base64"
  }) {
    _id
    title
    content
  }
}
```

### Delete Post
```graphql
mutation {
  deletePost(id: "post-id")
}
```

## API Endpoints

- GraphQL Endpoint: `/graphql`
- File Upload Endpoint: `/upload`
- Static Files: `/images`

## Security Features

- JWT-based authentication
- Password hashing using bcrypt
- CORS protection
- File upload validation
- Input validation
- Error handling middleware

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
