import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithBadResponse, getUserId } from "../common";
import parseMultipartFormData from "@anzp/azure-function-multipart";
import { ParsedFile } from "@anzp/azure-function-multipart/dist/types/parsed-file.type";
import { ParsedField } from "@anzp/azure-function-multipart/dist/types/parsed-field.type";
import { blobContainerClient, leaderboardCollection } from "../common/connections";



interface Entry {
  id: string;
  userId: string;
  userName: string;
  points: number;
}

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    if (!req.body) {
      return endWithBadResponse(context, "no body");
    }

    const { fields, files } = await parseMultipartFormData(req);

    await blobContainerClient.createIfNotExists();

    const querySpec = {
      query: "SELECT TOP 1 * FROM Leaderboard l WHERE l.userId = @userId",
      parameters: [
        {
          name: "@userId",
          value: getUserId(context),
        },
      ],
    };

    const { resources: matchingEntries } = await leaderboardCollection.items.query<Entry>(querySpec).fetchAll();

    if (matchingEntries.length === 0) {
      return endWithBadResponse(context, "user entry not found");
    }

    const entryToUpdate = matchingEntries[0];
    entryToUpdate.points += Number(getParsedItemByName(fields, "points").value);

    await leaderboardCollection.item(entryToUpdate.id).replace(entryToUpdate);

    context.log("Entry points successfully incremented");
    context.done();
  } catch (error) {
    context.log.error(error.message);
    throw error;
  }
};
export default httpTrigger;

const getParsedItemByName = <T extends ParsedFile | ParsedField>(items: T[], name: string): T => {
  return items.find((item) => item.name === name);
};

