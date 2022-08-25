import { CreateOperationInput } from "@azure/cosmos";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { endWithBadResponse, healthyTreeName } from "../common";
import { cosmosDbClient, dictsCollection } from "../common/connections";

const dictTypeNames = ["species", "state", "badState"] as const;
type DictType = typeof dictTypeNames[number];

interface DictItemDefinition {
  id?: string;
  type: DictType;
  name: string;
}

const containerName = "Dicts";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  if (!dictTypeNames.includes(req.params.type as DictType)) {
    return endWithBadResponse(context);
  }

  const containerResponse = await cosmosDbClient.containers.createIfNotExists({
    id: containerName,
    partitionKey: "/type",
    uniqueKeyPolicy: { uniqueKeys: [{ paths: ["/name"] }] },
  });

  if (containerResponse.statusCode === 201) {
    const operations = createDictItemOperations("state", [healthyTreeName, "chore/uszkodzone"])
      .concat(createDictItemOperations("badState", ["złamane", "ścięte", "uschnięte", "szkodniki", "inne"]))
      .concat(
        createDictItemOperations("species", [
          "brzoza",
          "buk",
          "dąb",
          "dąb czerwony",
          "grab",
          "głóg",
          "jarząb",
          "kasztanowiec",
          "klon",
          "klon jesionolistny",
          "lipa",
          "platan",
          "robinia",
          "topola",
          "wierzba",
          "wiąz",
          "śliwa",
          "jabłoń",
          "grusza",
          "czeremcha",
          "świerk",
          "jodła",
          "modrzew",
          "sosna",
          "surmia katalpa",
          "daglezja",
          "cis",
          "glediczja",
          "miłorząb",
          "ambrowiec amerykański",
          "tulipanowiec",
          "magnolia ",
          "inne/nie wiem",
        ]),
      );

    await dictsCollection.items.bulk(operations);
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

  const { resources } = await dictsCollection.items.query(querySpec).fetchAll();

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
