import express from "express";
import TwitterApi from "twitter-api-v2";
import path from "path";
import AWS from "aws-sdk";

const fs = require("fs");
const router = express.Router();

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const s3Client = new AWS.S3({ region: process.env.AWS_BUCKET_REGION });

router.get("/", async (req: express.Request, res: express.Response) => {
  const { query } = req;
  const { username } = query;
  try {
    const user = await twitterClient.v2.userByUsername(username as string);
    if (user) {
      const file_path = `./${username}.txt`;

      await s3Client.listObjects(
        { Bucket: process.env.AWS_BUCKET_NAME },
        async (err, objects) => {
          if (err) throw err;
          if (objects && objects.Contents) {
            let found = objects.Contents.find(
              (object) => object.Key === `${username}.txt`
            );
            if (found) {
              const fileStream = s3Client
                .getObject(
                  {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `${username}.txt`,
                  },
                  (err) => {
                    if (err) throw err;
                  }
                )
                .createReadStream();
              fileStream.pipe(res);
            } else {
              let timeline = await twitterClient.v2.userTimeline(user.data.id, {
                exclude: ["replies", "retweets"],
                expansions: [
                  "attachments.media_keys",
                  "attachments.poll_ids",
                  "referenced_tweets.id",
                ],
                "media.fields": ["url"],
              });
              let formated_tweets = "";

              for await (const tweet of timeline) {
                formated_tweets += `${tweet.text}\n`;
              }

              fs.writeFile(file_path, formated_tweets, async (err: any) => {
                if (err) throw err;
                let fileStream = fs.createReadStream(`./${username}.txt`);
                fileStream.on("error", (err: any) => {
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
                uploadParams.Key = path.basename(`${username}.txt`);

                await s3Client.upload(uploadParams, (err: any) => {
                  if (err) throw err;
                  const fileStream = s3Client
                    .getObject(
                      {
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: `${username}.txt`,
                      },
                      (err) => {
                        if (err) throw err;
                      }
                    )
                    .createReadStream();
                  fileStream.pipe(res);
                });
              });
            }
          }
        }
      );
    } else {
      res.json({ success: false, message: "User not found" }).status(404);
    }
  } catch (e) {
    console.log(e);
    res.json({ success: false, message: "An error has occurred" }).status(400);
  }
});

module.exports = router;
