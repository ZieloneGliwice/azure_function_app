import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { getBoundary, parse } from "parse-multipart-data";
// import * as exifjs from "exif-js";
// import { Blob } from "node:buffer"

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  try {
    if (!req.body) {
      return endWithBadResponse(context);
    }

    const parts = parse(
      Buffer.from(req.body),
      getBoundary(req.headers["content-type"])
    );

    if (
      parts.length !== 2 ||
      !parts[0].filename ||
      parts[1].name !== "userId"
    ) {
      return endWithBadResponse(context);
    }

    // const meta = exifjs.readFromBinaryFile(parts[0].data.buffer);

    var blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.BlobStorageConnectionString
    );

    const containerClient = blobServiceClient.getContainerClient("images");
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(
      parts[0].filename
    );

    await blockBlobClient.uploadData(parts[0].data, {
      blobHTTPHeaders: { blobContentType: parts[0].type },
    });

    context.bindings.cosmosDbRes = JSON.stringify({
      imageUrl: blockBlobClient.url,
      userId: Buffer.from(parts[1].data).toString(),
    });

    context.log("HTTP trigger function processed a request.");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};

export default httpTrigger;

function endWithBadResponse(context, message = "Bad Request") {
  context.log.error(message);
  context.res = {
    status: 400,
    body: message,
  };
  context.done();
}
