export interface Dummy {
  id: number;
  dummyName: string;
}

export interface CreateDummyInput {
  dummyName: string;
}

export interface UpdateDummyInput {
  id: number;
  dummyName: string;
}
