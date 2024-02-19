import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithBadResponse, getUserId } from "../common";
import parseMultipartFormData from "@anzp/azure-function-multipart";
import { ParsedFile } from "@anzp/azure-function-multipart/dist/types/parsed-file.type";
import { ParsedField } from "@anzp/azure-function-multipart/dist/types/parsed-field.type";
import { blobContainerClient, dictsCollection } from "../common/connections";



interface Entry {
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

    const newEntry: Entry = {
      userId: getUserId(context),
      userName: getParsedItemByName(fields, "userName").value,
      points: Number(getParsedItemByName(fields, "points").value),
    };

    context.bindings.cosmosDbRes = JSON.stringify(newEntry);

    context.log("Entry successfully created");
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

