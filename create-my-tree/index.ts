import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlockBlobClient } from "@azure/storage-blob";
import * as sharp from "sharp";
import imageType from "image-type";
import { v4 as uuidv4 } from "uuid";
import { Blob } from "node:buffer";
import { endWithBadResponse, getUserId } from "../common";
import parseMultipartFormData from "@anzp/azure-function-multipart";
import { ParsedFile } from "@anzp/azure-function-multipart/dist/types/parsed-file.type";
import { ParsedField } from "@anzp/azure-function-multipart/dist/types/parsed-field.type";
import * as NodeGeocoder from "node-geocoder";
import { blobContainerClient, dictsCollection } from "../common/connections";
import { validateFields, validateFiles } from "./validation";

global.Blob = Blob as any;

interface DictItem {
  type: string;
  name: string;
  id: string;
}

interface Tree {
  treeImageUrl: string;
  treeThumbnailUrl: string;
  leafImageUrl: string;
  barkImageUrl?: string;
  species: string;
  description: string;
  perimeter: number;
  state: string;
  stateDescription: string;
  latLong: string;
  address?: string;
  userId: string;
}

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

    const querySpec = {
      query: `SELECT d.id
                  ,d.name
                  ,d.type
              FROM Dicts d
              WHERE (
                  d.type = "state"
                  AND d.id = @stateId
                  )
                OR (
                  d.type = "species"
                  AND d.id = @speciesId
                  )`,
      parameters: [
        {
          name: "@speciesId",
          value: getParsedItemByName(fields, "species").value,
        },
        {
          name: "@stateId",
          value: getParsedItemByName(fields, "state").value,
        },
      ],
    };

    const { resources: dictItems } = await dictsCollection.items.query<DictItem>(querySpec).fetchAll();

    if (dictItems.length !== 2) {
      return endWithBadResponse(context);
    }

    const options: NodeGeocoder.OpenStreetMapOptions = {
      provider: "openstreetmap",
      email: process.env.Email,
    };

    const geoCoder = NodeGeocoder(options);
    const coordinates = getParsedItemByName(fields, "lat-long").value.split(",");
    const geoCoderResponse = await geoCoder.reverse({ lat: coordinates[0], lon: coordinates[1] });

    await blobContainerClient.createIfNotExists();

    // Tree image
    const treeImageParsedFile = getParsedItemByName(files, "tree");
    const treeImageTypeInfo = imageType(treeImageParsedFile.bufferFile);
    const treeImageBlobName = `${uuidv4()}.${treeImageTypeInfo.ext}`;

    const treeImageBlobClient = blobContainerClient.getBlockBlobClient(treeImageBlobName);
    await treeImageBlobClient.uploadData(treeImageParsedFile.bufferFile, {
      blobHTTPHeaders: { blobContentType: treeImageTypeInfo.mime },
    });

    // Tree thumbnail image
    const treeImageThumbnail = await sharp(treeImageParsedFile.bufferFile).resize(200, 200).withMetadata().toBuffer();
    const treeImageThumbnailBlobName = `thumbnail-${treeImageBlobName}`;

    const treeThumbnailBlobClient = blobContainerClient.getBlockBlobClient(treeImageThumbnailBlobName);
    await treeThumbnailBlobClient.uploadData(treeImageThumbnail, {
      blobHTTPHeaders: { blobContentType: treeImageTypeInfo.mime },
    });

    // Leaf image
    const leafImageParsedFile = getParsedItemByName(files, "leaf");
    const leafImageTypeInfo = imageType(leafImageParsedFile.bufferFile);
    const leafImageBlobName = `${uuidv4()}.${leafImageTypeInfo.ext}`;

    const leafImageBlobClient = blobContainerClient.getBlockBlobClient(leafImageBlobName);
    await leafImageBlobClient.uploadData(leafImageParsedFile.bufferFile, {
      blobHTTPHeaders: { blobContentType: leafImageTypeInfo.mime },
    });

    // Bark image (optional)
    let barkImageBlobClient: BlockBlobClient = null;
    const barkImageParsedFile = getParsedItemByName(files, "bark");
    if (barkImageParsedFile) {
      const barkImageTypeInfo = imageType(barkImageParsedFile.bufferFile);
      const barkImageBlobName = `${uuidv4()}.${barkImageTypeInfo.ext}`;

      barkImageBlobClient = blobContainerClient.getBlockBlobClient(barkImageBlobName);
      await barkImageBlobClient.uploadData(barkImageParsedFile.bufferFile, {
        blobHTTPHeaders: { blobContentType: barkImageTypeInfo.mime },
      });
    }

    const newTree: Tree = {
      treeImageUrl: treeImageBlobClient.url,
      treeThumbnailUrl: treeThumbnailBlobClient.url,
      leafImageUrl: leafImageBlobClient.url,
      barkImageUrl: barkImageBlobClient?.url,
      species: getDictItemByType(dictItems, "species").name,
      description: getParsedItemByName(fields, "description").value,
      perimeter: Number(getParsedItemByName(fields, "perimeter").value),
      state: getDictItemByType(dictItems, "state").name,
      stateDescription: getParsedItemByName(fields, "state-description").value,
      latLong: getParsedItemByName(fields, "lat-long").value,
      address: geoCoderResponse[0].formattedAddress,
      userId: getUserId(context),
    };

    context.bindings.cosmosDbRes = JSON.stringify(newTree);

    context.log("Tree successfully created");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};
export default httpTrigger;

const getParsedItemByName = <T extends ParsedFile | ParsedField>(items: T[], name: string): T => {
  return items.find((item) => item.name === name);
};

const getDictItemByType = (items: DictItem[], type: string): DictItem => {
  return items.find((item) => item.type === type);
};
