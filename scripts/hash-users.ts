import * as crypto from "crypto";

// Replace with array from CosmosDB
// Query:
// SELECT u.userId, COUNT(1) AS addedTrees FROM Users u GROUP BY u.userId
const users = [
  {
    userId: "sid:ac6eb55424aa261f183775bf7e9c258f",
    addedTrees: 1,
  },
  {
    userId: "sid:ec79cd5c30c32204619d9ed1c9b7b0ce",
    addedTrees: 1,
  },
];

const hashUsers = () => {
  return users.map((item) => {
    return {
      hash: crypto.createHash("shake256", { outputLength: 5 }).update(item.userId).digest("hex"),
      addedTrees: item.addedTrees,
    };
  });
};

console.log(hashUsers());
