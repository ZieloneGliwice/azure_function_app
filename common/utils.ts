import {
  BlobSASSignatureValues,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export const getBlobSasUri = (blobUrl: string) => {
  const sharedKeyCredential = new StorageSharedKeyCredential(process.env.BlobAccountName, process.env.BlobAccountKey);

  const sasOptions: BlobSASSignatureValues = {
    containerName: "images",
    blobName: blobUrl.split("images/").pop(),
    permissions: ContainerSASPermissions.parse("r"),
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000),
  };

  const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
  return `${blobUrl}?${sasToken}`;
};
