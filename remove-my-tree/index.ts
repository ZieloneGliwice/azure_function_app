import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithNotFoundResponse, getUserId } from "../common";
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
            WHERE t.userId = @userId
              AND t.id = @id`,
      parameters: [
        {
          name: "@userId",
          value: getUserId(context),
        },
        {
          name: "@id",
          value: req.params.id,
        },
      ],
    };

    const { resources } = await treesCollection.items.query<Tree>(querySpec).fetchAll();
    const treeToDelete = resources.shift();

    if (!treeToDelete) {
      return endWithNotFoundResponse(context);
    }

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

    context.log("Tree successfully deleted");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }

  context.done();
};
export default httpTrigger;

const getBlobName = (blobUrl: string): string => {
  return blobUrl.split("images/").pop();
};
