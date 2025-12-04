"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const types_1 = require("../shared/types");
class AuthController {
    constructor() {
        this.register = async (req, res) => {
            try {
                const { email, password, username, full_name, role } = req.body;
                if (!email || !password || !username || !role) {
                    res.status(400).json({
                        success: false,
                        error: 'Email, password, username, and role are required.'
                    });
                    return;
                }
                if (!Object.values(types_1.UserRole).includes(role)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid role. Must be citizen, collector, or recycler.'
                    });
                    return;
                }
                const existingUser = await database_1.db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
                if (existingUser.rows.length > 0) {
                    res.status(400).json({
                        success: false,
                        error: 'User with this email or username already exists.'
                    });
                    return;
                }
                const passwordHash = await bcryptjs_1.default.hash(password, 10);
                const result = await database_1.db.query(`INSERT INTO users (email, password_hash, username, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, uuid, email, username, full_name, role, eiu_balance, created_at`, [email, passwordHash, username, full_name || null, role]);
                const user = result.rows[0];
                const token = (0, auth_1.generateToken)(user);
                res.status(201).json({
                    success: true,
                    data: {
                        user,
                        token
                    }
                });
            }
            catch (error) {
                console.error('Register error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error creating user account.'
                });
            }
        };
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    res.status(400).json({
                        success: false,
                        error: 'Email and password are required.'
                    });
                    return;
                }
                const result = await database_1.db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
                if (result.rows.length === 0) {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid email or password.'
                    });
                    return;
                }
                const user = result.rows[0];
                const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
                if (!isValidPassword) {
                    res.status(401).json({
                        success: false,
                        error: 'Invalid email or password.'
                    });
                    return;
                }
                delete user.password_hash;
                const token = (0, auth_1.generateToken)(user);
                res.json({
                    success: true,
                    data: {
                        user,
                        token
                    }
                });
            }
            catch (error) {
                console.error('Login error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error during login.'
                });
            }
        };
        this.getProfile = async (req, res) => {
            try {
                const authReq = req;
                if (!authReq.user) {
                    res.status(401).json({
                        success: false,
                        error: 'Not authenticated.'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: authReq.user
                });
            }
            catch (error) {
                console.error('Get profile error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error fetching profile.'
                });
            }
        };
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map