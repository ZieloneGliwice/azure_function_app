import { CosmosClient } from "@azure/cosmos";
import { AzureFunction, Context } from "@azure/functions";
import { getContainerSasUri, getUserId } from "../common";

const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
  const client = new CosmosClient(process.env.CosmosDbConnectionString);
  const container = client.database("GreenGliwice").container("Trees");

  const querySpec = {
    query: `SELECT t.id, t.thumbnailUrl
            FROM Trees t
            WHERE t.userId = @userId`,
    parameters: [
      {
        name: "@userId",
        value: getUserId(context),
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();

  context.res = {
    body: { trees: resources, sasToken: resources.length > 0 ? getContainerSasUri() : undefined },
  };
};
export default httpTrigger;
