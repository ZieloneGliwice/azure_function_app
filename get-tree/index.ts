import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithNotFoundResponse, getContainerSasUri, getUserId } from "../common";
import { treesCollection } from "../common/connections";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const querySpec = {
    query: `SELECT t.treeImageUrl
                ,t.leafImageUrl
                ,t.barkImageUrl
                ,t.species
                ,t.description
                ,t.perimeter
                ,t.state
                ,t.stateDescription
                ,t.badState
                ,t.latLong
                ,t.geocoderInfo
            FROM Trees t
            WHERE t.id = @id`,
    parameters: [
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
