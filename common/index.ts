import { Context } from "@azure/functions";
import {
  BlobSASSignatureValues,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import fetch from "node-fetch";

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

export const authorizeAdminAsync = async (context: Context) => {
  const authMeResponse = await fetch(process.env.AuthMeEndpoint, {
    method: "GET",
    headers: {
      authorization: context.req?.headers.authorization,
      "x-zumo-auth": context.req?.headers["x-zumo-auth"],
    },
  });

  if (authMeResponse.status !== 200) {
    context.res = {
      status: 401,
      body: "Failed to fetch user info.",
    };
    context.done();
  }

  const userClaims = (await authMeResponse.json())[0].user_claims;
  const email = userClaims.find(
    (claim: { typ: string; val: string }) =>
      claim.typ === "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  )?.val;
  const adminEmails = process.env.AdminEmails.split(" ");

  if (!adminEmails.includes(email)) {
    context.res = {
      status: 401,
      body: "User is not an admin.",
    };
    context.done();
  }
};
