import { CosmosClient } from "@azure/cosmos";
import { ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";

export const cosmosDbClient = new CosmosClient(process.env.CosmosDbConnectionString).database(process.env.CosmosDbName);

export const dictsCollection = cosmosDbClient.container("Dicts");

export const treesCollection = cosmosDbClient.container("Trees");

export const blobContainerClient = new ContainerClient(
  `${process.env.BlobUrl}/images${process.env.Environment === "development" ? "-dev" : ""}`,
  new StorageSharedKeyCredential(process.env.BlobAccountName, process.env.BlobAccountKey),
);
