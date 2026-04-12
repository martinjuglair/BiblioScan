import { supabase } from "@infrastructure/supabase/client";
import { Result } from "@domain/shared/Result";
import {
  ReadingGroup,
  GroupMember,
  GroupBook,
  GroupReview,
  GroupActivity,
  GroupActivityType,
} from "@domain/entities/ReadingGroup";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  return data.user.id;
}

async function getUserMeta(): Promise<{ id: string; email: string; firstName: string | null }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    firstName: (data.user.user_metadata?.first_name as string) ?? null,
  };
}

export class SupabaseReadingGroupRepository {
  // ─── Groups ────────────────────────────────────────────

  async createGroup(name: string, description: string, emoji: string): Promise<Result<ReadingGroup>> {
    try {
      const user = await getUserMeta();
      const inviteCode = generateInviteCode();

      // Insert group (returns id only — SELECT policy needs membership)
      const { data: insertData, error: insertError } = await supabase
        .from("reading_groups")
        .insert({
          name,
          description,
          emoji,
          created_by: user.id,
          invite_code: inviteCode,
        })
        .select("id")
        .single();

      if (insertError) return Result.fail(insertError.message);

      // Add creator as admin member FIRST (so SELECT policy works)
      await supabase.from("group_members").insert({
        group_id: insertData.id,
        user_id: user.id,
        first_name: user.firstName,
        email: user.email,
        role: "admin",
      });

      // Now fetch full group (RLS allows it since user is a member)
      const { data, error } = await supabase
        .from("reading_groups")
        .select("*")
        .eq("id", insertData.id)
        .single();

      if (error) return Result.fail(error.message);
      return Result.ok(this.rowToGroup(data));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur création groupe");
    }
  }

  async findMyGroups(): Promise<Result<ReadingGroup[]>> {
    try {
      const userId = await getUserId();

      // Get groups where user is a member
      const { data: memberships, error: memError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      if (memError) return Result.fail(memError.message);
      if (!memberships || memberships.length === 0) return Result.ok([]);

      const groupIds = memberships.map((m) => m.group_id);

      const { data, error } = await supabase
        .from("reading_groups")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      if (error) return Result.fail(error.message);
      return Result.ok((data ?? []).map((r) => this.rowToGroup(r)));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  async findByInviteCode(code: string): Promise<Result<ReadingGroup | null>> {
    try {
      const { data, error } = await supabase
        .from("reading_groups")
        .select("*")
        .eq("invite_code", code)
        .maybeSingle();

      if (error) return Result.fail(error.message);
      if (!data) return Result.ok(null);
      return Result.ok(this.rowToGroup(data));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  async updateGroup(groupId: string, updates: { name?: string; emoji?: string }): Promise<Result<ReadingGroup>> {
    try {
      const updateData: Record<string, string> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.emoji !== undefined) updateData.emoji = updates.emoji;

      const { data, error } = await supabase
        .from("reading_groups")
        .update(updateData)
        .eq("id", groupId)
        .select("*")
        .single();

      if (error) return Result.fail(error.message);
      return Result.ok(this.rowToGroup(data));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur mise à jour groupe");
    }
  }

  async removeMember(groupId: string, userId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) return Result.fail(error.message);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur suppression membre");
    }
  }

  async deleteGroup(groupId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from("reading_groups")
        .delete()
        .eq("id", groupId);

      if (error) return Result.fail(error.message);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  // ─── Members ───────────────────────────────────────────

  async joinGroup(groupId: string): Promise<Result<void>> {
    try {
      const user = await getUserMeta();

      const { error } = await supabase.from("group_members").upsert({
        group_id: groupId,
        user_id: user.id,
        first_name: user.firstName,
        email: user.email,
        role: "member",
      }, { onConflict: "group_id,user_id" });

      if (error) return Result.fail(error.message);

      // Log activity
      await this.logActivity(groupId, user, "join", null, null, null);

      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  async leaveGroup(groupId: string): Promise<Result<void>> {
    try {
      const user = await getUserMeta();

      // Log activity BEFORE deleting membership (need to be a member to insert)
      await this.logActivity(groupId, user, "leave", null, null, null);

      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) return Result.fail(error.message);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  async getMembers(groupId: string): Promise<Result<GroupMember[]>> {
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (error) return Result.fail(error.message);
      return Result.ok(
        (data ?? []).map((r) => ({
          groupId: r.group_id,
          userId: r.user_id,
          firstName: r.first_name ?? null,
          email: r.email,
          role: r.role as "admin" | "member",
          joinedAt: new Date(r.joined_at),
        })),
      );
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  // ─── Books ─────────────────────────────────────────────

  async shareBook(
    groupId: string,
    isbn: string,
    title: string,
    coverUrl: string | null,
    noteText: string | null,
    message: string | null = null,
  ): Promise<Result<void>> {
    try {
      const user = await getUserMeta();

      const { error } = await supabase.from("group_books").upsert(
        {
          group_id: groupId,
          isbn,
          title,
          cover_url: coverUrl,
          shared_by: user.id,
          shared_by_name: user.firstName,
          note_text: noteText,
        },
        { onConflict: "group_id,isbn" },
      );

      if (error) return Result.fail(error.message);

      // Log activity
      await this.logActivity(groupId, user, "share_book", message, title, isbn);

      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  async getGroupBooks(groupId: string): Promise<Result<GroupBook[]>> {
    try {
      const { data, error } = await supabase
        .from("group_books")
        .select("*")
        .eq("group_id", groupId)
        .order("shared_at", { ascending: false });

      if (error) return Result.fail(error.message);
      return Result.ok(
        (data ?? []).map((r) => ({
          groupId: r.group_id,
          isbn: r.isbn,
          title: r.title,
          coverUrl: r.cover_url,
          sharedBy: r.shared_by,
          sharedByName: r.shared_by_name ?? null,
          sharedAt: new Date(r.shared_at),
          noteText: r.note_text ?? null,
        })),
      );
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  // ─── Reviews ───────────────────────────────────────────

  async addReview(
    groupId: string,
    isbn: string,
    rating: number,
    comment: string | null,
    bookTitle: string | null = null,
  ): Promise<Result<void>> {
    try {
      const user = await getUserMeta();

      const { error } = await supabase.from("group_reviews").upsert(
        {
          group_id: groupId,
          isbn,
          user_id: user.id,
          user_name: user.firstName,
          rating,
          comment,
        },
        { onConflict: "group_id,isbn,user_id" },
      );

      if (error) return Result.fail(error.message);

      // Log activity
      await this.logActivity(groupId, user, "review", `${"★".repeat(rating)}${"☆".repeat(5 - rating)}${comment ? ` — ${comment}` : ""}`, bookTitle, isbn);

      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  async getReviews(groupId: string, isbn: string): Promise<Result<GroupReview[]>> {
    try {
      const { data, error } = await supabase
        .from("group_reviews")
        .select("*")
        .eq("group_id", groupId)
        .eq("isbn", isbn)
        .order("created_at", { ascending: false });

      if (error) return Result.fail(error.message);
      return Result.ok(
        (data ?? []).map((r) => ({
          id: r.id,
          groupId: r.group_id,
          isbn: r.isbn,
          userId: r.user_id,
          userName: r.user_name ?? null,
          rating: r.rating,
          comment: r.comment ?? null,
          createdAt: new Date(r.created_at),
        })),
      );
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  // ─── Activity ──────────────────────────────────────────

  async getActivity(groupId: string, limit = 30): Promise<Result<GroupActivity[]>> {
    try {
      const { data, error } = await supabase
        .from("group_activity")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return Result.fail(error.message);
      return Result.ok(
        (data ?? []).map((r) => ({
          id: r.id,
          groupId: r.group_id,
          userId: r.user_id,
          userName: r.user_name ?? null,
          type: r.type as GroupActivityType,
          message: r.message ?? null,
          bookTitle: r.book_title ?? null,
          bookIsbn: r.book_isbn ?? null,
          createdAt: new Date(r.created_at),
        })),
      );
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur");
    }
  }

  private async logActivity(
    groupId: string,
    user: { id: string; firstName: string | null },
    type: GroupActivityType,
    message: string | null,
    bookTitle: string | null,
    bookIsbn: string | null,
  ): Promise<void> {
    try {
      await supabase.from("group_activity").insert({
        group_id: groupId,
        user_id: user.id,
        user_name: user.firstName,
        type,
        message,
        book_title: bookTitle,
        book_isbn: bookIsbn,
      });
    } catch {
      // Activity logging is best-effort, don't fail the main operation
    }
  }

  // ─── Helpers ───────────────────────────────────────────

  private rowToGroup(row: Record<string, unknown>): ReadingGroup {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? "",
      emoji: (row.emoji as string) ?? "📚",
      createdBy: row.created_by as string,
      inviteCode: row.invite_code as string,
      createdAt: new Date(row.created_at as string),
    };
  }
}
