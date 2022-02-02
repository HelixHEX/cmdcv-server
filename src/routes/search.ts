import express from "express";
import TwitterApi from "twitter-api-v2";
import path from "path";
import AWS from "aws-sdk";

const router = express.Router();
const fs = require("fs");
// const multer = require("multer");

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const s3Client = new AWS.S3({ region: process.env.AWS_BUCKET_REGION });

// router.get('/',  (req, res) => {
//   res.json({success: true, url: 'hisdf'})
// })

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
              let all_tweets = [] as any;
              let timeline = await twitterClient.v2.userTimeline(user.data.id, {
                exclude: ["replies", "retweets"],
              });
              all_tweets = timeline.data.data;
              while (!timeline.done) {
                let fetchedTweets = await timeline.fetchNext();
                all_tweets.push(fetchedTweets.data.data);
              }
              let formated_tweets = "";
              all_tweets.forEach(
                (tweet: any) => (formated_tweets += `${tweet.text}\n`)
              );

              fs.writeFile(file_path, formated_tweets, (err: any) => {
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

                s3Client.upload(uploadParams, (err: any) => {
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

      // if (!fs.existsSync("./uploads")) {
      //   console.log("no directory");
      //   fs.mkdirSync("./uploads", { recursive: true });
      // }
      // if (!fs.existsSync(file_path)) {
      //   console.log("no file");
      //   await twitterClient.v2
      //     .userTimeline(user.data.id, {
      //       exclude: ["replies", "retweets"],
      //     })
      //     .then((response) => {
      //       all_tweets = response.data.data;
      //       let formated_tweets = "";
      //       all_tweets.forEach(
      //         (tweet: any) => (formated_tweets += `${tweet.text}\n`)
      //       );

      //       fs.writeFile(file_path, formated_tweets, function (err: any) {
      //         if (err) throw err;
      //         const filePath = path.resolve(".", file_path);
      //         const fileBufer = fs.readFileSync(filePath);
      //         res.setHeader("Content-Type", "text/plain");
      //         res.status(200).send(fileBufer);
      //       })
      //     });

      //   // while (!timeline.done) {
      //   //   let fetchedTweets = await timeline.fetchNext()
      //   //   all_tweets.push(fetchedTweets.data.data)
      //   // }

      //   // res.json({ success: true, tweets: all_tweets }).status(200);
      // } else {
      //   const filePath = path.resolve(".", file_path);
      //   const fileBufer = fs.readFileSync(filePath);
      //   res.setHeader("Content-Type", "text/plain");
      //   res.status(200).send(fileBufer);
      // }
      // let interval = setInterval(() => {
      //   const filePath = path.resolve(".", file_path);
      //   const fileExists = fs.existsSync(filePath);

      //   if (fileExists) {
      //     clearInterval(interval)
      //   }
      // }, 2000)

      // res.status(200);
    } else {
      res.json({ success: false, message: "User not found" }).status(404);
    }
  } catch (e) {
    console.log(e);
    res.json({ success: false, message: "An error has occurred" }).status(400);
  }
});

module.exports = router;
