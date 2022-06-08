import {
  BlobSASSignatureValues,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export const getContainerSasUri = () => {
  const sharedKeyCredential = new StorageSharedKeyCredential(process.env.BlobAccountName, process.env.BlobAccountKey);

  const sasOptions: BlobSASSignatureValues = {
    containerName: "images",
    permissions: ContainerSASPermissions.parse("r"),
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000),
  };

  return generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
};
