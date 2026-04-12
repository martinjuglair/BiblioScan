import { supabase } from "@infrastructure/supabase/client";
import { Result } from "@domain/shared/Result";
import { Friend, FriendInvite, DirectShare, DirectShareType } from "@domain/entities/Friendship";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function getUserMeta(): Promise<{ id: string; name: string }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  const name = (data.user.user_metadata?.first_name as string)
    || data.user.email?.split("@")[0]
    || "Utilisateur";
  return { id: data.user.id, name };
}

export class SupabaseFriendshipRepository {
  // ─── Invites ────────────────────────────────────────────

  async createInviteCode(): Promise<Result<string>> {
    try {
      const user = await getUserMeta();
      const code = generateCode();
      const { error } = await supabase.from("friend_invites").insert({
        from_user_id: user.id,
        from_user_name: user.name,
        invite_code: code,
      });
      if (error) return Result.fail(error.message);
      return Result.ok(code);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async findInviteByCode(code: string): Promise<Result<FriendInvite | null>> {
    try {
      const { data, error } = await supabase
        .from("friend_invites")
        .select("*")
        .eq("invite_code", code.toUpperCase())
        .maybeSingle();
      if (error) return Result.fail(error.message);
      if (!data) return Result.ok(null);
      return Result.ok({
        id: data.id,
        fromUserId: data.from_user_id,
        fromUserName: data.from_user_name,
        inviteCode: data.invite_code,
        createdAt: new Date(data.created_at),
      });
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async acceptInvite(code: string): Promise<Result<void>> {
    try {
      const user = await getUserMeta();

      // Find the invite
      const { data: invite, error: findErr } = await supabase
        .from("friend_invites")
        .select("*")
        .eq("invite_code", code.toUpperCase())
        .maybeSingle();
      if (findErr) return Result.fail(findErr.message);
      if (!invite) return Result.fail("Code d'invitation introuvable");
      if (invite.from_user_id === user.id) return Result.fail("Vous ne pouvez pas vous ajouter vous-même");

      // Create friendship (both directions with upsert)
      const { error: e1 } = await supabase.from("friendships").upsert({
        user_id: user.id,
        friend_id: invite.from_user_id,
        user_name: user.name,
        friend_name: invite.from_user_name,
      }, { onConflict: "user_id,friend_id" });
      if (e1) return Result.fail(e1.message);

      const { error: e2 } = await supabase.from("friendships").upsert({
        user_id: invite.from_user_id,
        friend_id: user.id,
        user_name: invite.from_user_name,
        friend_name: user.name,
      }, { onConflict: "user_id,friend_id" });
      if (e2) return Result.fail(e2.message);

      // Delete the invite
      await supabase.from("friend_invites").delete().eq("id", invite.id);

      return Result.ok(undefined);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  // ─── Friends ────────────────────────────────────────────

  async getMyFriends(): Promise<Result<Friend[]>> {
    try {
      const user = await getUserMeta();
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return Result.fail(error.message);

      const friends: Friend[] = (data ?? []).map((r: any) => ({
        friendshipId: r.id,
        userId: r.friend_id,
        displayName: r.friend_name || "Ami",
        createdAt: new Date(r.created_at),
      }));
      return Result.ok(friends);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async removeFriend(friendshipId: string): Promise<Result<void>> {
    try {
      // Get the friendship to find both directions
      const { data: fs, error: fErr } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("id", friendshipId)
        .single();
      if (fErr) return Result.fail(fErr.message);

      // Delete both directions
      await supabase.from("friendships").delete()
        .eq("user_id", fs.user_id).eq("friend_id", fs.friend_id);
      await supabase.from("friendships").delete()
        .eq("user_id", fs.friend_id).eq("friend_id", fs.user_id);

      return Result.ok(undefined);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  // ─── Direct Shares ──────────────────────────────────────

  async sendShare(params: {
    toUserId: string;
    isbn: string;
    title: string;
    coverUrl: string | null;
    message: string | null;
    rating: number | null;
    comment: string | null;
    type: DirectShareType;
  }): Promise<Result<void>> {
    try {
      const user = await getUserMeta();
      const { error } = await supabase.from("direct_shares").insert({
        from_user_id: user.id,
        to_user_id: params.toUserId,
        from_user_name: user.name,
        isbn: params.isbn,
        title: params.title,
        cover_url: params.coverUrl,
        message: params.message,
        rating: params.rating,
        comment: params.comment,
        type: params.type,
      });
      if (error) return Result.fail(error.message);
      return Result.ok(undefined);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async getInbox(): Promise<Result<DirectShare[]>> {
    try {
      const user = await getUserMeta();
      const { data, error } = await supabase
        .from("direct_shares")
        .select("*")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return Result.fail(error.message);
      return Result.ok((data ?? []).map(this.rowToShare));
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async getSentShares(): Promise<Result<DirectShare[]>> {
    try {
      const user = await getUserMeta();
      const { data, error } = await supabase
        .from("direct_shares")
        .select("*")
        .eq("from_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return Result.fail(error.message);
      return Result.ok((data ?? []).map(this.rowToShare));
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async markAsRead(shareId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from("direct_shares")
        .update({ is_read: true })
        .eq("id", shareId);
      if (error) return Result.fail(error.message);
      return Result.ok(undefined);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async markLendReturned(shareId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from("direct_shares")
        .update({ lend_returned: true })
        .eq("id", shareId);
      if (error) return Result.fail(error.message);
      return Result.ok(undefined);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async getUnreadCount(): Promise<Result<number>> {
    try {
      const user = await getUserMeta();
      const { count, error } = await supabase
        .from("direct_shares")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .eq("is_read", false);
      if (error) return Result.fail(error.message);
      return Result.ok(count ?? 0);
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async getActiveLends(): Promise<Result<DirectShare[]>> {
    try {
      const user = await getUserMeta();
      const { data, error } = await supabase
        .from("direct_shares")
        .select("*")
        .eq("from_user_id", user.id)
        .eq("type", "lend")
        .eq("lend_returned", false)
        .order("created_at", { ascending: false });
      if (error) return Result.fail(error.message);
      return Result.ok((data ?? []).map(this.rowToShare));
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  async getBorrowedBooks(): Promise<Result<DirectShare[]>> {
    try {
      const user = await getUserMeta();
      const { data, error } = await supabase
        .from("direct_shares")
        .select("*")
        .eq("to_user_id", user.id)
        .eq("type", "lend")
        .eq("lend_returned", false)
        .order("created_at", { ascending: false });
      if (error) return Result.fail(error.message);
      return Result.ok((data ?? []).map(this.rowToShare));
    } catch (e: any) {
      return Result.fail(e.message);
    }
  }

  private rowToShare(row: any): DirectShare {
    return {
      id: row.id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      fromUserName: row.from_user_name,
      isbn: row.isbn,
      title: row.title,
      coverUrl: row.cover_url,
      message: row.message,
      rating: row.rating,
      comment: row.comment,
      type: row.type,
      isRead: row.is_read,
      lendReturned: row.lend_returned,
      createdAt: new Date(row.created_at),
    };
  }
}
