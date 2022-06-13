import { CosmosClient, CreateOperationInput } from "@azure/cosmos";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithBadResponse, getContainerSasUri, getUserId } from "../common";

const dictTypeNames = ["species", "state"] as const;
type DictType = typeof dictTypeNames[number];

interface DictItemDefinition {
  id?: string;
  type: DictType;
  name: string;
}

const containerName = "Dicts";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const client = new CosmosClient(process.env.CosmosDbConnectionString);
  const database = client.database(process.env.CosmosDbName);

  if (!dictTypeNames.includes(req.params.type as DictType)) {
    return endWithBadResponse(context);
  }

  const containerResponse = await database.containers.createIfNotExists({
    id: containerName,
    partitionKey: "/type",
    uniqueKeyPolicy: { uniqueKeys: [{ paths: ["/name"] }] },
  });

  const container = database.container(containerName);

  if (containerResponse.statusCode === 201) {
    const operations = createDictItemOperations("state", ["zdrowe", "chore", "inne/nie wiem"]).concat(
      createDictItemOperations("species", ["sosna", "wierzba", "klon", "inne/nie wiem"]),
    );

    await container.items.bulk(operations);
  }

  const querySpec = {
    query: `SELECT d.id
                ,d.name
              FROM Dicts d
              WHERE d.type = @type`,
    parameters: [
      {
        name: "@type",
        value: req.params.type,
      },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();

  context.res = {
    body: resources,
  };
};
export default httpTrigger;

const createDictItemOperations = (type: DictType, items: string[]) => {
  const operations: CreateOperationInput[] = [];

  for (const item of items) {
    const dictItemDefinition: DictItemDefinition = { type, name: item };

    operations.push({
      operationType: "Create",
      resourceBody: JSON.parse(JSON.stringify(dictItemDefinition)),
    });
  }

  return operations;
};
