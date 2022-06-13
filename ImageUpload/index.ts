import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlockBlobClient, ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import * as sharp from "sharp";
import imageType from "image-type";
import { v4 as uuidv4 } from "uuid";
import { Blob } from "node:buffer";
import { endWithBadResponse, getUserId } from "../common";
import parseMultipartFormData from "@anzp/azure-function-multipart";
import { ParsedFile } from "@anzp/azure-function-multipart/dist/types/parsed-file.type";
import { ParsedField } from "@anzp/azure-function-multipart/dist/types/parsed-field.type";
import validator from "validator";

global.Blob = Blob as any;

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    if (!req.body) {
      return endWithBadResponse(context);
    }

    const { fields, files } = await parseMultipartFormData(req);

    if (!validateFiles(files)) {
      return endWithBadResponse(context);
    }

    if (!validateFields(fields)) {
      return endWithBadResponse(context);
    }

    const containerClient = new ContainerClient(
      `${process.env.BlobUrl}/images`,
      new StorageSharedKeyCredential(process.env.BlobAccountName, process.env.BlobAccountKey),
    );

    await containerClient.createIfNotExists();

    // Tree image
    const treeImageParsedFile = getItemByName(files, "tree");
    const treeImageTypeInfo = imageType(treeImageParsedFile.bufferFile);
    const treeImageBlobName = `${uuidv4()}.${treeImageTypeInfo.ext}`;

    const treeImageBlobClient = containerClient.getBlockBlobClient(treeImageBlobName);
    await treeImageBlobClient.uploadData(treeImageParsedFile.bufferFile, {
      blobHTTPHeaders: { blobContentType: treeImageTypeInfo.mime },
    });

    // Tree thumbnail image
    const treeImageThumbnail = await sharp(treeImageParsedFile.bufferFile).resize(200, 200).withMetadata().toBuffer();
    const treeImageThumbnailBlobName = `thumbnail-${treeImageBlobName}`;

    const treeThumbnailBlobClient = containerClient.getBlockBlobClient(treeImageThumbnailBlobName);
    await treeThumbnailBlobClient.uploadData(treeImageThumbnail, {
      blobHTTPHeaders: { blobContentType: treeImageTypeInfo.mime },
    });

    // Leaf image
    const leafImageParsedFile = getItemByName(files, "leaf");
    const leafImageTypeInfo = imageType(leafImageParsedFile.bufferFile);
    const leafImageBlobName = `${uuidv4()}.${leafImageTypeInfo.ext}`;

    const leafImageBlobClient = containerClient.getBlockBlobClient(leafImageBlobName);
    await leafImageBlobClient.uploadData(leafImageParsedFile.bufferFile, {
      blobHTTPHeaders: { blobContentType: leafImageTypeInfo.mime },
    });

    // Bark image (optional)
    let barkImageBlobClient: BlockBlobClient = null;
    const barkImageParsedFile = getItemByName(files, "bark");
    if (barkImageParsedFile) {
      const barkImageTypeInfo = imageType(barkImageParsedFile.bufferFile);
      const barkImageBlobName = `${uuidv4()}.${barkImageTypeInfo.ext}`;

      barkImageBlobClient = containerClient.getBlockBlobClient(barkImageBlobName);
      await barkImageBlobClient.uploadData(barkImageParsedFile.bufferFile, {
        blobHTTPHeaders: { blobContentType: barkImageTypeInfo.mime },
      });
    }

    context.bindings.cosmosDbRes = JSON.stringify({
      treeImageUrl: treeImageBlobClient.url,
      treeThumbnailUrl: treeThumbnailBlobClient.url,
      leafImageUrl: leafImageBlobClient.url,
      barkImageUrl: barkImageBlobClient ? barkImageBlobClient.url : undefined,
      species: getItemByName(fields, "species").value,
      description: getItemByName(fields, "description").value,
      perimeter: getItemByName(fields, "perimeter").value,
      state: getItemByName(fields, "state").value,
      stateDescription: getItemByName(fields, "state-description").value,
      latLong: getItemByName(fields, "lat-long").value,
      userId: getUserId(context),
    });

    context.log("HTTP trigger function processed a request.");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};
export default httpTrigger;

const validateFiles = (files: ParsedFile[]): boolean => {
  const acceptedFiles = ["tree", "leaf", "bark"];
  const requiredFiles = ["tree", "leaf"];

  return validateItemsExistence<ParsedFile>(files, acceptedFiles, requiredFiles);
};

const validateFields = (fields: ParsedField[]): boolean => {
  const requiredFields = ["species", "description", "perimeter", "state", "state-description", "lat-long"];

  if (!validateItemsExistence<ParsedField>(fields, requiredFields, requiredFields)) {
    return false;
  }

  let result = true;

  for (const field of fields) {
    switch (field.name) {
      case "species":
      case "state": {
        result = validator.isUUID(field.value);
        break;
      }
      case "perimeter": {
        result = validator.isNumeric(field.value) && field.value > 0;
        break;
      }
      case "lat-long": {
        result = validator.isLatLong(field.value);
        break;
      }
      default: {
        result = !validator.isEmpty(field.value);
      }
    }

    if (!result) {
      break;
    }
  }

  return result;
};

const validateItemsExistence = <T extends ParsedFile | ParsedField>(
  items: T[],
  acceptedNames: string[],
  requiredNames: string[],
): boolean => {
  const itemNames = items.map((item: T) => item.name);

  return (
    itemNames.every((name) => acceptedNames.includes(name)) && requiredNames.every((name) => itemNames.includes(name))
  );
};

const getItemByName = <T extends ParsedFile | ParsedField>(items: T[], name: string): T => {
  return items.find((item) => item.name === name);
};
