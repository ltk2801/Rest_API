const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");

// get posts
exports.getPosts = (req, res, next) => {
  // Phân trang product
  const currentPage = req.query.page || 1; // Lấy tham số query hoặc mặc định là 1
  const perPage = 2; // 2 product 1 page
  let totalItems; // Tổng số product có trong db
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      // skip là bỏ qua số phần tử ở trước nó, limit là lấy ra đúng chừng đó tiếp theo
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      if (!posts) {
        const error = new Error("Could not find post. ");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        message: "Fetched posts successfully ",
        posts: posts,
        totalItems: totalItems,
        perPage: perPage,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
// post feed
exports.postPost = (req, res, next) => {
  // Bắt lỗi validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  // kiểm tra file
  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }
  // Nhận dữ liệu gửi lên
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;
  let creator;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    // tại vì ở middleware đã xác thực lưu id user vào req
    creator: req.userId,
  });
  // Create post in db
  post
    .save()
    .then((result) => {
      // Tìm kiếm user có ID đang đăng nhập
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      // Create posts in userSchema
      user.posts.push(post);
      return user.save();
    })
    .then((result) => {
      // Bắn API lên client
      res.status(201).json({
        message: "Post created successfully !",
        post: post,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// Get post
exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post. ");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: "Post fetched.", post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// Edit post
exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  // Lấy ra đường dẫn của ảnh cũ
  let imageUrl = req.body.image;
  // Nếu có ảnh mới
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  // Nếu không có ảnh
  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post. ");
        error.statusCode = 404;
        throw error;
      }
      // kiểm tra xem bài post này có phải do user này đăng không thì mới có quyền chỉnh sửa
      if (post.creator.toString() !== req.userId) {
        const error = new Error("Not authorized!");
        error.statusCode = 403;
        throw error;
      }
      // Nếu có thay đổi ảnh mới thì clear ảnh cũ và thay thế bằng ảnh mới
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Post updated!", post: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
// Delete post
exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post. ");
        error.statusCode = 404;
        throw error;
      }
      // kiểm tra xem bài post này có phải do user này đăng không thì mới có quyền chỉnh sửa
      if (post.creator.toString() !== req.userId) {
        const error = new Error("Not authorized!");
        error.statusCode = 403;
        throw error;
      }
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      // Xóa bài đăng trong User
      user.posts.pull(postId);
      return user.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Deleted post !" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// clear file

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(console.log(err)));
};
