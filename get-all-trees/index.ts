import { AzureFunction, Context } from "@azure/functions";
import { authorizeAdminAsync } from "../common";

const httpTrigger: AzureFunction = async function (context: Context): Promise<void> {
  await authorizeAdminAsync(context);
};
export default httpTrigger;
