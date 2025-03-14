const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();
require("dotenv").config();

const signUp = async (req, res) => {
  let { fullName, email, current_password } = req.body;
  console.log(req.body);
  if (email) {
    email = email.toLowerCase().trim();
  }

  if (!fullName || !email || !current_password) {
    return res.status(400).json({
      message: "All required files: fullName, email and password",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (current_password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }

  try {
    const existingUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(current_password, 10);

    const user = await prisma.users.create({
      data: {
        fullName,
        email,
        current_password: hashedPassword,
      },
    });

    res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error.", error });
  }
};

const signIn = async (req, res) => {
  let { email, current_password } = req.body;
  console.log(req.body);

  if (email) {
    email = email.toLowerCase().trim();
  }

  if (!email || !current_password) {
    return res.status(400).json({
      message: "Both fields are required.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    const findUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    // Verify if user exists
    if (!findUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const validatePassword = await bcrypt.compare(
      current_password,
      findUser.current_password
    );

    if (!validatePassword) {
      return res.status(401).json({
        message: "Password doesn't match.",
      });
    }

    const token = jwt.sign(
      {
        id: findUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    console.log(token);
    

    return res.status(200).json({
      message: "User logged in successfully.",
      token,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Login failed.", error });
  }
};

module.exports = {
  signUp,
  signIn,
};
