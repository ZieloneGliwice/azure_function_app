import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithNotFoundResponse, getContainerSasUri, getUserId } from "../common";
import { treesCollection } from "../common/connections";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
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

  const { resources } = await treesCollection.items.query(querySpec).fetchAll();

  if (resources.length === 0) {
    return endWithNotFoundResponse(context);
  }

  context.res = {
    body: { ...resources.shift(), sasToken: getContainerSasUri() },
  };
};
export default httpTrigger;
