import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { getBoundary, parse } from "parse-multipart-data";
import * as sharp from "sharp";
// import * as exifjs from "exif-js";
// import { Blob } from "node:buffer"

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const bodyBuffer = Buffer.from(req.body);
  const boundary = getBoundary(req.headers["content-type"]);
  const parts = parse(bodyBuffer, boundary);
  const image = parts[0];

  const thumbnail = await sharp(image.data).resize(200, 200).withMetadata().toBuffer();

  // const meta = exifjs.readFromBinaryFile(parts[0].data.buffer);

  var blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.BlobStorageConnectionString
  );

  const containerClient = blobServiceClient.getContainerClient("images");
  await containerClient.createIfNotExists();

  const imageBlobClient = containerClient.getBlockBlobClient(image.filename);
  const uploadImageResponse = await imageBlobClient.uploadData(image.data, {
    blobHTTPHeaders: { blobContentType: image.type },
  });

  const thumbnailBlobClient = containerClient.getBlockBlobClient(`thumbnail-${image.filename}`);
  const uploadThumbnailResponse = await thumbnailBlobClient.uploadData(thumbnail, {
    blobHTTPHeaders: { blobContentType: image.type },
  });

  context.bindings.cosmosDbRes = JSON.stringify({
    imageUrl: imageBlobClient.url,
    thumbnailUrl: thumbnailBlobClient.url,
    userId: "test-user-id",
  });

  context.log("HTTP trigger function processed a request.");
  const name = req.query.name || (req.body && req.body.name);
  const responseMessage = name
    ? "Hello, " + name + ". This HTTP triggered function executed successfully."
    : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: responseMessage,
  };
};

export default httpTrigger;
