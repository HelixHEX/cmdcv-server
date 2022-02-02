declare namespace NodeJS {
  export interface ProcessEnv {
    PORT: string;
    TWITTER_CONSUMER_KEY: string;
    TWITTER_CONSUMER_SECRET: string;
    TWITTER_BEARER_TOKEN: string;
    AWS_BUCKET_NAME: string;
    AWS_BUCKET_REGION: string;
  }
}