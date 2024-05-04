/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";

import {
  S3Client,
} from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


const s3 = new S3Client();
const ddbDocClient = createDDbDocClient();

export const handler: SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);  // Parse SQS message
   

    if (recordBody.Records) {
      console.log("Record body ", JSON.stringify(record.body));
      for (const messageRecord of recordBody.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));

        // Check file extension
        const fileExtension = srcKey.split(".").pop()?.toLowerCase();
        if (!fileExtension||(fileExtension !== "jpeg" && fileExtension !== "png")) {
          throw new Error(`Invalid file extension for object '${srcKey}'. Expected '.jpeg' or '.png'.`);
        }
        await ddbDocClient.send(
          new PutCommand({
            TableName: "Pictures",
            Item: {
              pictureName: srcKey,
            },
          })
        );
      }
    }
  }
};
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });

  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };

  const unmarshallOptions = {
    wrapNumbers: false,
  };

  const translateConfig = { marshallOptions, unmarshallOptions };

  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}