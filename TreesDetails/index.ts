import { CosmosClient } from "@azure/cosmos";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithNotFoundResponse, getContainerSasUri, getUserId } from "../common";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const client = new CosmosClient(process.env.CosmosDbConnectionString);
  const container = client.database(process.env.CosmosDbName).container("Trees");

  const querySpec = {
    query: `SELECT t.treeImageUrl
                ,t.leafImageUrl
                ,t.barkImageUrl
                ,t.latLong
                ,t.address
                ,t.state
                ,t.stateDescription
                ,t.description
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

  const { resources } = await container.items.query(querySpec).fetchAll();

  if (resources.length === 0) {
    return endWithNotFoundResponse(context);
  }

  context.res = {
    body: { ...resources.shift(), sasToken: getContainerSasUri() },
  };
};
export default httpTrigger;
