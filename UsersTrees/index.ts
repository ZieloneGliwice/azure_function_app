import { CosmosClient } from "@azure/cosmos";
import { AzureFunction, Context } from "@azure/functions";
import { getContainerSasUri, getUserId } from "../common";

const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
  const client = new CosmosClient(process.env.CosmosDbConnectionString);
  const container = client.database(process.env.CosmosDbName).container("Trees");

  const querySpec = {
    query: `SELECT t.id
                ,t.treeThumbnailUrl
                ,t._ts
                ,t.latLong
                ,t.species
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
