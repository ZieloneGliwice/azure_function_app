import { CosmosClient } from "@azure/cosmos";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getBlobSasUri, testUserId } from "../common";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const client = new CosmosClient(process.env.CosmosDbConnectionString);
  const container = client.database("GreenGliwice").container("Trees");

  const querySpec = {
    query: `SELECT t.id, t.thumbnailUrl
            FROM Trees t
            WHERE t.userId = @userId`,
    parameters: [
      {
        name: "@userId",
        value: process.env.Environment === "Development" ? testUserId : context.req.headers["x-ms-client-principal-id"],
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();

  context.res = {
    body: resources.map((item) => {
      return { ...item, thumbnailUrl: getBlobSasUri(item.thumbnailUrl) };
    }),
  };
};
export default httpTrigger;
