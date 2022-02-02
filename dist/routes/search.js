"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const twitter_api_v2_1 = __importDefault(require("twitter-api-v2"));
const path_1 = __importDefault(require("path"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const router = express_1.default.Router();
const fs = require("fs");
const twitterClient = new twitter_api_v2_1.default(process.env.TWITTER_BEARER_TOKEN);
const s3Client = new aws_sdk_1.default.S3({ region: process.env.AWS_BUCKET_REGION });
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req;
    const { username } = query;
    try {
        const user = yield twitterClient.v2.userByUsername(username);
        if (user) {
            const file_path = `./${username}.txt`;
            yield s3Client.listObjects({ Bucket: process.env.AWS_BUCKET_NAME }, (err, objects) => __awaiter(void 0, void 0, void 0, function* () {
                if (err)
                    throw err;
                if (objects && objects.Contents) {
                    let found = objects.Contents.find((object) => object.Key === `${username}.txt`);
                    if (found) {
                        const fileStream = s3Client
                            .getObject({
                            Bucket: process.env.AWS_BUCKET_NAME,
                            Key: `${username}.txt`,
                        }, (err) => {
                            if (err)
                                throw err;
                        })
                            .createReadStream();
                        fileStream.pipe(res);
                    }
                    else {
                        yield twitterClient.v2
                            .userTimeline(user.data.id, {
                            exclude: ["replies", "retweets"],
                        })
                            .then((response) => {
                            let all_tweets = response.data.data;
                            let formated_tweets = "";
                            all_tweets.forEach((tweet) => (formated_tweets += `${tweet.text}\n`));
                            fs.writeFile(file_path, formated_tweets, (err) => {
                                if (err)
                                    throw err;
                                let fileStream = fs.createReadStream(`./${username}.txt`);
                                fileStream.on("error", (err) => {
                                    console.log("File Error", err);
                                    res
                                        .json({ success: false, message: "File error" })
                                        .status(400);
                                });
                                let uploadParams = {
                                    Bucket: process.env.AWS_BUCKET_NAME,
                                    Key: "",
                                    Body: "",
                                };
                                uploadParams.Body = fileStream;
                                uploadParams.Key = path_1.default.basename(`${username}.txt`);
                                s3Client.upload(uploadParams, (err) => {
                                    if (err)
                                        throw err;
                                    const fileStream = s3Client
                                        .getObject({
                                        Bucket: process.env.AWS_BUCKET_NAME,
                                        Key: `${username}.txt`,
                                    }, (err) => {
                                        if (err)
                                            throw err;
                                    })
                                        .createReadStream();
                                    fileStream.pipe(res);
                                });
                            });
                        });
                    }
                }
            }));
        }
        else {
            res.json({ success: false, message: "User not found" }).status(404);
        }
    }
    catch (e) {
        console.log(e);
        res.json({ success: false, message: "An error has occurred" }).status(400);
    }
}));
module.exports = router;
//# sourceMappingURL=search.js.map