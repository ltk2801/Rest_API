const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");

// get posts
exports.getPosts = async (req, res, next) => {
  // Phân trang product
  const currentPage = req.query.page || 1; // Lấy tham số query hoặc mặc định là 1
  const perPage = 2; // 2 product 1 page
  try {
    const count = await Post.find().countDocuments(); // Tổng số product có trong db
    // skip là bỏ qua số phần tử ở trước nó, limit là lấy ra đúng chừng đó tiếp theo
    const posts = await Post.find()
      .populate("creator")
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    if (!posts) {
      const error = new Error("Could not find post. ");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Fetched posts successfully ",
      posts: posts,
      totalItems: count,
      perPage: perPage,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
// post feed
exports.postPost = async (req, res, next) => {
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
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    // tại vì ở middleware đã xác thực lưu id user vào req
    creator: req.userId,
  });
  // Create post in db
  // Tìm kiếm user có ID đang đăng nhập
  try {
    await post.save();
    const user = await User.findById(req.userId);
    // Create posts in userSchema
    user.posts.push(post);
    await user.save();
    // Bắn API lên client
    res.status(201).json({
      message: "Post created successfully !",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Get post
exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post. ");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Post fetched.", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Edit post
exports.updatePost = async (req, res, next) => {
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

  try {
    const post = await Post.findById(postId);
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
    const result = await post.save();
    res.status(200).json({ message: "Post updated!", post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
// Delete post
exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
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
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    // Xóa bài đăng trong User
    user.posts.pull(postId);
    await user.save();
    res.status(200).json({ message: "Deleted post !" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// clear file

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(console.log(err)));
};
