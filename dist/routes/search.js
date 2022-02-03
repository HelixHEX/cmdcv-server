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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const twitter_api_v2_1 = __importDefault(require("twitter-api-v2"));
const path_1 = __importDefault(require("path"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const fs = require("fs");
const router = express_1.default.Router();
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
                var e_1, _a;
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
                        let timeline = yield twitterClient.v2.userTimeline(user.data.id, {
                            exclude: ["replies", "retweets"],
                            expansions: [
                                "attachments.media_keys",
                                "attachments.poll_ids",
                                "referenced_tweets.id",
                            ],
                            "media.fields": ["url"],
                        });
                        let formated_tweets = "";
                        try {
                            for (var timeline_1 = __asyncValues(timeline), timeline_1_1; timeline_1_1 = yield timeline_1.next(), !timeline_1_1.done;) {
                                const tweet = timeline_1_1.value;
                                formated_tweets += `${tweet.text}\n`;
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (timeline_1_1 && !timeline_1_1.done && (_a = timeline_1.return)) yield _a.call(timeline_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        fs.writeFile(file_path, formated_tweets, (err) => __awaiter(void 0, void 0, void 0, function* () {
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
                            yield s3Client.upload(uploadParams, (err) => {
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
                        }));
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