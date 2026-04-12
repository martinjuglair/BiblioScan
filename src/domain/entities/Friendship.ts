export type DirectShareType = "share" | "lend" | "return";

export interface Friend {
  friendshipId: string;
  userId: string;
  displayName: string;
  createdAt: Date;
}

export interface FriendInvite {
  id: string;
  fromUserId: string;
  fromUserName: string | null;
  inviteCode: string;
  createdAt: Date;
}

export interface DirectShare {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string | null;
  isbn: string;
  title: string;
  coverUrl: string | null;
  message: string | null;
  rating: number | null;
  comment: string | null;
  type: DirectShareType;
  isRead: boolean;
  lendReturned: boolean;
  createdAt: Date;
}
