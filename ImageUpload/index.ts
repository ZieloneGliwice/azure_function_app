import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { getBoundary, parse } from "parse-multipart-data";
import * as sharp from "sharp";
import imageType from "image-type";
import { v4 as uuidv4 } from "uuid";
import * as exif from "exif-js";
import { Blob } from "node:buffer";

global.Blob = Blob as any;

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    if (!req.body) {
      return endWithBadResponse(context);
    }

    const parts = parse(Buffer.from(req.body), getBoundary(req.headers["content-type"]));

    if (parts.length !== 1 || !parts[0].filename) {
      return endWithBadResponse(context);
    }

    const imageInput = parts[0];
    const imageTypeInfo = imageType(imageInput.data);
    const imageBlobStorageName = `${uuidv4()}.${imageTypeInfo.ext}`;

    const thumbnail = await sharp(imageInput.data).resize(200, 200).withMetadata().toBuffer();

    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.BlobStorageConnectionString);

    const containerClient = blobServiceClient.getContainerClient("images");
    await containerClient.createIfNotExists();

    const imageBlobClient = containerClient.getBlockBlobClient(imageBlobStorageName);
    await imageBlobClient.uploadData(parts[0].data, {
      blobHTTPHeaders: { blobContentType: imageTypeInfo.mime },
    });

    const thumbnailBlobClient = containerClient.getBlockBlobClient(`thumbnail-${imageBlobStorageName}`);
    await thumbnailBlobClient.uploadData(thumbnail, {
      blobHTTPHeaders: { blobContentType: imageTypeInfo.mime },
    });

    const imageMetadata = exif.readFromBinaryFile(imageInput.data.buffer);

    const latitudeDMS = imageMetadata.GPSLatitude;
    const latitudeDirection = imageMetadata.GPSLatitudeRef;
    const longitudeDMS = imageMetadata.GPSLongitude;
    const longitudeDirection = imageMetadata.GPSLongitudeRef;

    const latitude =
      latitudeDMS?.length === 3 && ["N", "S"].includes(latitudeDirection)
        ? dmsToDD(latitudeDMS[0], latitudeDMS[1], latitudeDMS[2], latitudeDirection)
        : undefined;
    const longitude =
      longitudeDMS?.length === 3 && ["E", "W"].includes(longitudeDirection)
        ? dmsToDD(longitudeDMS[0], longitudeDMS[1], longitudeDMS[2], longitudeDirection)
        : undefined;

    context.bindings.cosmosDbRes = JSON.stringify({
      imageUrl: imageBlobClient.url,
      thumbnailUrl: thumbnailBlobClient.url,
      userId: context.req.headers["x-ms-client-principal-id"],
      gpsCoordinates: {
        latitude,
        longitude,
      },
    });

    context.log("HTTP trigger function processed a request.");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};

export default httpTrigger;

const endWithBadResponse = (context, message = "Bad Request") => {
  context.log.error(message);
  context.res = {
    status: 400,
    body: message,
  };
  context.done();
};

const dmsToDD = (degrees: number, minutes: number, seconds: number, direction: string) => {
  var dd = degrees + minutes / 60 + seconds / (60 * 60);

  if (direction === "S" || direction === "W") {
    dd = -dd;
  }

  return dd;
};
