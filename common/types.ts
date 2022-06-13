export interface DictItem {
  type: string;
  name: string;
  id: string;
}

export interface Tree {
  treeImageUrl: string;
  treeThumbnailUrl: string;
  leafImageUrl: string;
  barkImageUrl?: string;
  species: string;
  description: string;
  perimeter: number;
  state: string;
  stateDescription: string;
  latLong: string;
  userId: string;
}
