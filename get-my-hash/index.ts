import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getUserId } from "../common";
import * as crypto from "crypto";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const userId = getUserId(context);
  const userIdHash = crypto.createHash("shake256", { outputLength: 5 }).update(userId).digest("hex");

  context.res = {
    body: userIdHash,
  };
};

export default httpTrigger;
