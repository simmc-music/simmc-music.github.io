export type BandMember = { id: string; gameId: string; registered: boolean };
export type Band = {
  id: string; name: string; captainId: string; captainName: string;
  members: BandMember[]; isMember: boolean; canManage: boolean; createdAt: number;
};
export type Activity = {
  id: string; name: string; date: string; description: string; location: string;
  ownerId: string; ownerName: string; livehouseId: string | null;
  canManage: boolean; createdAt: number; signupCount: number;
};
export type ActivitySignup = {
  id: string; activityId: string; kind: "individual" | "band";
  playerId: string; bandId: string | null; displayName: string;
  createdAt: number; canDelete: boolean;
};
export type SignupPayload = { kind: "individual" | "band"; playerId?: string; bandId?: string };
