import "dotenv-safe/config";
import "reflect-metadata";

import express from "express";

const cors = require("cors");
import morgan from "morgan";

//routes 
const search = require('./routes/search')

import rateLimit from 'express-rate-limit'

const main = () => {
  const app = express();

  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
    message: {success: false, message: 'Too many requests, please try again later.'}
  })

  app.use(limiter)
  app.use(morgan("dev"));

  app.use(cors({ origin: "*" }));

  app.use(express.json());

  app.get("/", (_, res: express.Response) => {
    res.send("Hello world");
  });

  app.use("/api/v1/search", search);

  app.use((_, res: express.Response) => {
    res.status(404).json({ status: "404" });
  });

  app.listen(process.env.PORT || 5001, () => {
    console.log(`🚀 Server ready at http://localhost:${process.env.PORT}`);
  });
};

main();
