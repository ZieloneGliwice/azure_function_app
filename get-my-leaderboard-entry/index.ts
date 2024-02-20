import { AzureFunction, Context } from "@azure/functions";
import { getContainerSasUri, getUserId } from "../common";
import { leaderboardCollection} from "../common/connections";

const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
  const querySpec = {
    query: `SELECT l.userName
                ,l.points
            FROM Leaderboard l
            WHERE l.userId = @userId`,
    parameters: [
      {
        name: "@userId",
        value: getUserId(context),
      },
    ],
  };

  const { resources } = await leaderboardCollection.items.query(querySpec).fetchAll();

  context.res = {
    body: { entries: resources, sasToken: resources.length > 0 ? getContainerSasUri() : undefined },
  };
};
export default httpTrigger;