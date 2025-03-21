
require("dotenv").config();
jest.mock("dotenv", () => ({
    config: jest.fn(),

}));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();
const {signUp} = require('../../../src/controllers/AuthController');
const {config} = require("dotenv");

jest.mock("@prisma/client", () => {
    return {
        PrismaClient: jest.fn().mockImplementation (() =>{
            return {
                users: {
                    findUnique: jest.fn(),
                    create: jest.fn(),
                },
            };
        }),
    };
});

jest.mock("bcrypt", () => ({
        hash: jest.fn(),
    
}));


// Mock que omite algunos de los console.log del AuthController
jest.spyOn(console, "log").mockImplementation(() => {});

describe("signUp Controller Method", ()=> {
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
        expect(res.json).toHaveBeenCalledWith({message:"All required files: fullName, email and password"});
    })
    
    test("Shoud return error for invalid email format", async () => {
        req.body = {
            fullName: "User test",
            email: "test.com",
            current_password: "test123",
        };
        await signUp(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Invalid email format."});
    })
    

    test("Shoud return error for length password", async () => {
        req.body = {
            fullName: "User test",
            email: "test@test.com",
            current_password: "test1",
        };
        await signUp(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"Password must be at least 6 characters long."});
    })

    test("Shoud return error if email already exists", async () => {
        req.body = {
            fullName: "User test",
            email: "test@test.com",
            current_password: "test123",
        };
        prismaInstance.users.findUnique.mockResolvedValue({
            id: 1,
            email: "test@test.com"
        });
        await signUp(req, res);
        expect(prismaInstance.users.findUnique).toHaveBeenCalledWith({
            where: {
                email:"test@test.com"
            },
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({message:"User with this email already exists."});
    })

    test("Should create a user succesfully", async () => {
        req.body = {
            fullName: "User test",
            email: "test@test.com",
            current_password: "test123",
        };

        prismaInstance.users.findUnique.mockResolvedValue(null);

        const hashedPassword = "hashed_Password";
        bcrypt.hash.mockResolvedValue(hashedPassword);

        const createUser = {
            id: 1,
            fullName: "User test",
            email: "test@test.com"
        }
        prismaInstance.users.create.mockResolvedValue(createUser);

        await signUp(req, res);

        expect(prismaInstance.users.findUnique).toHaveBeenCalledWith({
            where: {
                email:"test@test.com"
            },
        });
        expect(bcrypt.hash).toHaveBeenCalledWith("test123", 10);
        expect(prismaInstance.users.create).toHaveBeenCalledWith({
            data: {
                fullName: "User test",
                email:"test@test.com",
                current_password: hashedPassword,
            },
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({message:"User created successfully."});
    })
})