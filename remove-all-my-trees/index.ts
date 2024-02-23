import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithNotFoundResponse, getBlobContainerName, getUserId } from "../common";
import { blobContainerClient, treesCollection } from "../common/connections";

interface Tree {
  id: string;
  treeImageUrl: string;
  treeThumbnailUrl: string;
  leafImageUrl: string;
  barkImageUrl?: string;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const querySpec = {
      query: `SELECT t.id
              ,t.treeThumbnailUrl
              ,t.treeImageUrl
              ,t.leafImageUrl
              ,t.barkImageUrl
            FROM Trees t
            WHERE t.userId = @userId`,
      parameters: [
        {
          name: "@userId",
          value: getUserId(context),
        },
      ],
    };

    const { resources } = await treesCollection.items.query<Tree>(querySpec).fetchAll();
    const treesToDelete = resources;

    if (!treesToDelete) {
      return endWithNotFoundResponse(context);
    }

    treesToDelete.forEach(async treeToDelete => {
      await treesCollection.item(treeToDelete.id, getUserId(context)).delete();

      const treeThumbnailImageBlobClient = blobContainerClient.getBlockBlobClient(
        getBlobName(treeToDelete.treeThumbnailUrl),
      );
  
      await treeThumbnailImageBlobClient.delete();
  
      const treeImageBlobClient = blobContainerClient.getBlockBlobClient(getBlobName(treeToDelete.treeImageUrl));
      await treeImageBlobClient.delete();
  
      const leafImageBlobClient = blobContainerClient.getBlockBlobClient(getBlobName(treeToDelete.leafImageUrl));
      await leafImageBlobClient.delete();
  
      if (treeToDelete.barkImageUrl) {
        const barkImageBlobClient = blobContainerClient.getBlockBlobClient(getBlobName(treeToDelete.barkImageUrl));
        await barkImageBlobClient.delete();
      }
    });

    context.log("Trees successfully deleted");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};
export default httpTrigger;

const getBlobName = (blobUrl: string): string => {
  return blobUrl.split(`${getBlobContainerName()}/`).pop();
};
