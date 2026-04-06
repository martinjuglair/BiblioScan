export interface ReadingGroup {
  id: string;
  name: string;
  description: string;
  emoji: string;
  createdBy: string;
  inviteCode: string;
  createdAt: Date;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  firstName: string | null;
  email: string;
  role: "admin" | "member";
  joinedAt: Date;
}

export interface GroupBook {
  groupId: string;
  isbn: string;
  title: string;
  coverUrl: string | null;
  sharedBy: string;
  sharedByName: string | null;
  sharedAt: Date;
  noteText: string | null;
}

export interface GroupReview {
  id: string;
  groupId: string;
  isbn: string;
  userId: string;
  userName: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
}
