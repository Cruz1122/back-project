require("dotenv").config();
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

// Creamos mocks para las funciones de Prisma
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

// Mock de PrismaClient
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    users: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  })),
}));

//Mock de la libreria bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

//Mock de la libreria jsonwebtoken
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("test_token"),
}));

const mockSendMail = jest.fn().mockResolvedValue({
  response: "250 Message sent",
});

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));



const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();
const { signUp, signIn } = require("../../../src/controllers/AuthController");
const { config } = require("dotenv");

// Mock que omite algunos de los console.log del AuthController
jest.spyOn(console, "log").mockImplementation(() => {});

describe("signUp Controller Method", () => {
  let req;
  let res;
  const prismaInstance = new PrismaClient();
  //Reiniciar mocks antes de cada prueba
  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });
  test("Return message all required fields", async () => {
    // Pasamos el request body de la solicitud
    req.body = {
      fullname: "User test",
      // email y current_password no se enviaron
    };
    // Ejecutamos la prueba
    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "All required files: fullName, email and password",
    });
  });

  test("Shoud return error for invalid email format", async () => {
    req.body = {
      fullName: "User test",
      email: "test.com",
      current_password: "test123",
    };
    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email format." });
  });

  test("Shoud return error for length password", async () => {
    req.body = {
      fullName: "User test",
      email: "test@test.com",
      current_password: "test1",
    };
    await signUp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password must be at least 6 characters long.",
    });
  });

  test("Shoud return error if email already exists", async () => {
    req.body = {
      fullName: "User test",
      email: "test@test.com",
      current_password: "test123",
    };
    prismaInstance.users.findUnique.mockResolvedValue({
      id: 1,
      email: "test@test.com",
    });
    await signUp(req, res);
    expect(prismaInstance.users.findUnique).toHaveBeenCalledWith({
      where: {
        email: "test@test.com",
      },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "User with this email already exists.",
    });
  });

  test("Should create a user successfully", async () => {
    req.body = {
      fullName: "User Test",
      email: "test@test.com",
      current_password: "test123",
    };

    // Usuario no existe
    mockFindUnique.mockResolvedValue(null);

    // Configurar mock para el hash
    const hashedPassword = "hashed_password";
    bcrypt.hash.mockResolvedValue(hashedPassword);

    const fixedDate = new Date("2025-03-28T01:55:53.437Z");
    jest.spyOn(global, "Date").mockImplementation(() => fixedDate);

    // Configurar mock para la creación de usuario
    const createdUser = {
      id: 1,
      fullName: "User Test",
      email: "test@test.com",
      status: "PENDING",
      verificationCode: "123456",
      verificationCodeExpires: fixedDate,
    };
    mockCreate.mockResolvedValue(createdUser);

    // Mock para el envío de email
    mockSendMail.mockResolvedValue({ response: "250 Message sent" });

    await signUp(req, res);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "test@test.com" },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("test123", 10);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        fullName: "User Test",
        email: "test@test.com",
        current_password: hashedPassword,
        status: "PENDING",
        verificationCode: expect.any(String),
        verificationCodeExpires: fixedDate,
      },
    });

    // Verificar que se intenta enviar un email
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@test.com",
        subject: "Código de verificación para tu cuenta",
        html: expect.stringContaining(""),
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message:
        "User registered successfully. Please check your email for the verification code.",
      userId: 1,
      email: "test@test.com",
    });
  });
});

describe("signIn Controller Method", () => {
  let req;
  let res;
  const prismaInstance = new PrismaClient();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("Should return error when email and password are not provided", async () => {
    req.body = {
      // email and current_password not provided
    };

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Both fields are required.",
    });
  });

  test("Should return error when email in invalida", async () => {
    req.body = {
      email: "invalidEmail",
      current_password: "password123",
    };

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email format." });
  });

  test("Should return error when user in not found", async () => {
    req.body = {
      email: "notfound@test.com",
      current_password: "password123",
    };
    mockFindUnique.mockResolvedValue(null);
    await signIn(req, res);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        email: "notfound@test.com",
      },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found." });
  });
    test("Should return error when password doesn't match", async () => {
      req.body = {
        email: "test@test.com",
        current_password: "wrongpassword",
      };

      // Simulamos que se encuentra el usuario
      mockFindUnique.mockResolvedValue({
        id: 1,
        email: "test@test.com",
        current_password: "hashedCorrectPassword",
      });

      // Simulamos que la contraseña no coincide
      bcrypt.compare.mockResolvedValue(false);

      await signIn(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "test@test.com" },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "wrongpassword",
        "hashedCorrectPassword"
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password doesn't match.",
      });
    });
    test("Should sign in user successfully and return token", async () => {
      const mockUserId = 1;
      req.body = {
        email: "test@test.com",
        current_password: "correctpassword",
      };

      // Simulamos que se encuentra el usuario
      mockFindUnique.mockResolvedValue({
        id: mockUserId,
        email: "test@test.com",
        current_password: "hashedCorrectPassword",
      });

      // Simulamos que la contraseña coincide
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      // Simulamos el entorno para JWT
      process.env.JWT_SECRET = "test_secret";

      await signIn(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "test@test.com" },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "correctpassword",
        "hashedCorrectPassword"
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUserId },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User logged in successfully.",
        token: "test_token",
      });
    });

    test("Should handle server error during sign in", async () => {
      req.body = {
        email: "test@test.com",
        current_password: "password123",
      };

      // Simulamos un error en la base de datos
      mockFindUnique.mockRejectedValue(new Error("Database error"));

      await signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Login failed.",
      });
    });
});