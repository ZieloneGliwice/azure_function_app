import { AzureFunction, Context } from "@azure/functions";
import { getContainerSasUri, getUserId } from "../common";
import { treesCollection } from "../common/connections";

const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
  const querySpec = {
    query: `SELECT t.id
                ,t.treeThumbnailUrl
                ,t._ts
                ,t.latLong
                ,t.species
            FROM Trees t`,
  };

  const { resources } = await treesCollection.items.query(querySpec).fetchAll();

  context.res = {
    body: { trees: resources, sasToken: resources.length > 0 ? getContainerSasUri() : undefined },
  };
};
export default httpTrigger;