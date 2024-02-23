import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithNotFoundResponse, getBlobContainerName, getUserId } from "../common";
import { leaderboardCollection } from "../common/connections";

interface EntryId {
  id: string;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const querySpec = {
      query: `SELECT l.id
              FROM Leaderboard l
              WHERE l.userId = @userId`,
      parameters: [
        {
          name: "@userId",
          value: getUserId(context),
        },
      ],
    };

    const { resources } = await leaderboardCollection.items.query<EntryId>(querySpec).fetchAll();
    const entriesToDelete = resources;

    if (!entriesToDelete) {
      return endWithNotFoundResponse(context);
    }

    entriesToDelete.forEach(async entryToDelete => {
      await leaderboardCollection.item(entryToDelete.id, getUserId(context)).delete();
    });

    context.log("Leaderboard entry successfully deleted");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};
export default httpTrigger;