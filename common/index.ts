import { Context } from "@azure/functions";
import {
  BlobSASSignatureValues,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const testUserId = "testUserId";

export const healthyTreeName = "zdrowe";
export const unhealthyTreeName = "chore/uszkodzone";

export const getBlobContainerName = () => {
  return process.env.Environment === "dev" ? "images-dev" : "images";
};

export const getContainerSasUri = () => {
  const sharedKeyCredential = new StorageSharedKeyCredential(process.env.BlobAccountName, process.env.BlobAccountKey);

  const sasOptions: BlobSASSignatureValues = {
    containerName: getBlobContainerName(),
    permissions: ContainerSASPermissions.parse("r"),
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000),
  };

  return generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
};

export const getUserId = (context: Context) => {
  return process.env.Environment === "Development" ? testUserId : context.req.headers["x-ms-client-principal-id"];
};

export const endWithBadResponse = (context: Context, message: string) => {
  const body = `Bad Request: ${message}`;
  context.log.error(body);
  context.res = {
    status: 400,
    body,
  };
  context.done();
};

export const endWithNotFoundResponse = (context: Context, message = "Not Found") => {
  context.log.error(message);
  context.res = {
    status: 404,
    body: message,
  };
  context.done();
};
