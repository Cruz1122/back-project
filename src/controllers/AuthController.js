const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const signUp = async (req, res) => {
    const {fullName, email, password} = req.body;
    const user = await prisma.user.create({
        data: {
            fullName,
            email,
            password
        }
    });
    
    res.status(201).json(user);
};
const signIn = async (req, res) => {
    const {email, password} = req.body;
    const user = await prisma.user.findFirst({
        where: {
            email,
            password
        }
    });
    if (user) {
        res.status(200).json({message: 'User found'});
    } else {
        res.status(404).json({message: 'User not found'});
    }
};