import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { getBoundary, parse } from "parse-multipart-data";
import * as sharp from "sharp";
import imageType from "image-type";
import { v4 as uuidv4 } from "uuid";
// import * as exif from "exif-js";
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

    const imageInput = parts[0];
    const imageTypeInfo = imageType(imageInput.data);
    const imageBlobStorageName = `${uuidv4()}.${imageTypeInfo.ext}`

    // const meta = exif.readFromBinaryFile(image.data.buffer);

    const thumbnail = await sharp(imageInput.data)
      .resize(200, 200)
      .withMetadata()
      .toBuffer();

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.BlobStorageConnectionString
    );

    const containerClient = blobServiceClient.getContainerClient("images");
    await containerClient.createIfNotExists();

    const imageBlobClient = containerClient.getBlockBlobClient(
      imageBlobStorageName
    );
    await imageBlobClient.uploadData(parts[0].data, {
      blobHTTPHeaders: { blobContentType: imageTypeInfo.mime },
    });

    const thumbnailBlobClient = containerClient.getBlockBlobClient(`thumbnail-${imageBlobStorageName}`);
    await thumbnailBlobClient.uploadData(thumbnail, {
      blobHTTPHeaders: { blobContentType: imageTypeInfo.mime },
    });

    context.bindings.cosmosDbRes = JSON.stringify({
      imageUrl: imageBlobClient.url,
      thumbnailUrl: thumbnailBlobClient.url,
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
