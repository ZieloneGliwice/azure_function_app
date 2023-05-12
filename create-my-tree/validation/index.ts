import validator from "validator";
import { ParsedField } from "@anzp/azure-function-multipart/dist/types/parsed-field.type";
import { ParsedFile } from "@anzp/azure-function-multipart/dist/types/parsed-file.type";

export const validateFiles = (files: ParsedFile[]): boolean => {
  const requiredFiles = ["tree", "leaf"];
  const acceptedFiles = [...requiredFiles, "bark"];

  return validateItemsExistence<ParsedFile>(files, requiredFiles, acceptedFiles);
};

export const validateFields = (fields: ParsedField[]): boolean => {
  const requiredFields = ["species", "description", "perimeter", "state", "lat-long"];
  const acceptedFiles = [...requiredFields, "state-description", "bad-state"];

  if (!validateItemsExistence<ParsedField>(fields, requiredFields, acceptedFiles)) {
    return false;
  }

  let result = true;

  for (const field of fields) {
    switch (field.name) {
      case "species":
      case "state":
      case "bad-state": {
        result = validator.isUUID(field.value);
        break;
      }
      case "perimeter": {
        result = validator.isNumeric(field.value) && field.value > 0;
        break;
      }
      case "lat-long": {
        result = validator.isLatLong(field.value);
        break;
      }
      default: {
        result = !validator.isEmpty(field.value);
      }
    }

    if (!result) {
      break;
    }
  }

  return result;
};

export const validateItemsExistence = <T extends ParsedFile | ParsedField>(
  items: T[],
  requiredNames: string[],
  acceptedNames?: string[],
): boolean => {
  const itemNames = items.map((item: T) => item.name);

  if (!acceptedNames) {
    acceptedNames = requiredNames;
  }

  return (
    itemNames.every((name) => acceptedNames.includes(name)) && requiredNames.every((name) => itemNames.includes(name))
  );
};
