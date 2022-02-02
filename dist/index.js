"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv-safe/config");
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors = require("cors");
const morgan_1 = __importDefault(require("morgan"));
const search = require('./routes/search');
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const main = () => {
    const app = (0, express_1.default)();
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 5 * 60 * 1000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many requests, please try again later.' }
    });
    app.use(limiter);
    app.use((0, morgan_1.default)("dev"));
    app.use(cors({ origin: "*" }));
    app.use(express_1.default.json());
    app.get("/", (_, res) => {
        res.send("Hello world");
    });
    app.use("/api/v1/search", search);
    app.use((_, res) => {
        res.status(404).json({ status: "404" });
    });
    app.listen(process.env.PORT || 5001, () => {
        console.log(`🚀 Server ready at http://localhost:${process.env.PORT}`);
    });
};
main();
//# sourceMappingURL=index.js.map