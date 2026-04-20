import { useEffect, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Category } from "@domain/entities/Category";
import { ReadingGroup } from "@domain/entities/ReadingGroup";
import { getCategorizedLibrary, updateBook, deleteBook, categoryRepository, readingGroupRepository, googleBooksSearch } from "@infrastructure/container";
import { CoverLightbox } from "./CoverLightbox";
import { BottomSheet } from "./BottomSheet";
import { BookDetailSkeleton } from "./Skeleton";
import { SwipeToRead } from "./SwipeToRead";
import { ReadBadge } from "./ReadBadge";
import { useToast } from "./Toast";
import { supabase } from "@infrastructure/supabase/client";
import { hapticLight, hapticMedium, hapticError } from "@interfaces/utils/haptics";

interface BookDetailProps {
  isbn: string;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function BookDetail({ isbn, onBack, onDeleted, onUpdated }: BookDetailProps) {
  const [book, setBook] = useState<ComicBook | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Edit form state
  const [priceInput, setPriceInput] = useState("");
  const [coverInput, setCoverInput] = useState("");

  // Rating/comment state
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  // Read state
  const [isRead, setIsRead] = useState(false);

  // Wishlist state
  const [isWishlist, setIsWishlist] = useState(false);

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Share to group state
  const [showShareGroup, setShowShareGroup] = useState(false);
  const [myGroups, setMyGroups] = useState<ReadingGroup[]>([]);
  const [sharingToGroup, setSharingToGroup] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [shareRating, setShareRating] = useState(0);
  const [shareComment, setShareComment] = useState("");


  // Buy picker
  const [showBuyPicker, setShowBuyPicker] = useState(false);

  // Social share
  const [showSocialShare, setShowSocialShare] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);

  // Send to group

  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      getCategorizedLibrary.execute(),
      categoryRepository.findAllByUser(),
    ]).then(([libResult, catsResult]) => {
      if (libResult.ok) {
        const allBooks = [
          ...libResult.value.categories.flatMap((c) => c.books),
          ...libResult.value.uncategorized,
        ];
        const found = allBooks.find((b) => b.isbn === isbn);
        setBook(found ?? null);
        if (found) initForm(found);
      }
      if (catsResult.ok) {
        setCategories(catsResult.value);
      }
      setLoading(false);
    });
  }, [isbn]);

  // Fetch description on-the-fly (cached server-side).
  useEffect(() => {
    if (!isbn) return;
    let cancelled = false;
    googleBooksSearch.lookupByISBN(isbn).then((res) => {
      if (!cancelled && res.ok && res.value.description) {
        setDescription(res.value.description.trim());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isbn]);

  const initForm = (b: ComicBook) => {
    setPriceInput(b.retailPrice ? b.retailPrice.amount.toFixed(2) : "");
    setCoverInput(b.coverUrl ?? "");
    setRating(b.rating);
    setComment(b.comment ?? "");
    setCategoryId(b.categoryId);
    setIsRead(b.isRead);
    setIsWishlist(b.wishlist);
  };

  const handleSave = async () => {
    if (!book) return;
    setSaving(true);

    const priceNum = priceInput.trim() ? parseFloat(priceInput) : null;

    const result = await updateBook.execute(isbn, {
      retailPriceAmount: priceNum,
      coverUrl: coverInput.trim() || null,
    });

    setSaving(false);
    if (result.ok) {
      hapticLight();
      setBook(result.value);
      setEditing(false);
      onUpdated();
      toast("Modifications enregistrées", "success");
    }
  };

  const handleCategoryChange = async (newCategoryId: string | null) => {
    hapticMedium();
    setCategoryId(newCategoryId);
    setSavingCategory(true);
    const result = await updateBook.execute(isbn, { categoryId: newCategoryId });
    setSavingCategory(false);
    if (result.ok) {
      setBook(result.value);
      onUpdated();
      toast("Catégorie mise à jour", "success");
    }
  };

  const handleToggleRead = async (newVal: boolean) => {
    setIsRead(newVal);
    const result = await updateBook.execute(isbn, { isRead: newVal });
    if (result.ok) {
      setBook(result.value);
      onUpdated();
      toast(newVal ? "Marqué comme lu ✓" : "Marqué comme à lire", "success");
    }
  };

  const handleToggleWishlist = async () => {
    const newVal = !isWishlist;
    hapticLight();
    setIsWishlist(newVal);
    const result = await updateBook.execute(isbn, { wishlist: newVal });
    if (result.ok) {
      setBook(result.value);
      onUpdated();
      toast(newVal ? "Ajouté aux souhaits" : "Retiré des souhaits", "success");
    }
  };

  const handleSaveReview = async () => {
    if (!book) return;
    hapticLight();
    setSavingReview(true);
    const result = await updateBook.execute(isbn, {
      rating,
      comment: comment.trim() || null,
    });
    setSavingReview(false);
    if (result.ok) {
      setBook(result.value);
      onUpdated();
      toast("Avis enregistré", "success");
    }
  };

  /** Generate a share card image using Canvas API — Clean Editorial */
  const generateShareCard = async (): Promise<string> => {
    const W = 1080;
    // We'll compute height dynamically, start with a temp canvas to measure
    const tmp = document.createElement("canvas");
    tmp.width = W;
    tmp.height = 100;
    const tctx = tmp.getContext("2d")!;

    // Measure content height
    let totalH = 80; // top brand padding
    const cw = 560, ch = 810;
    totalH += ch + 60; // cover + gap

    // Title
    tctx.font = "800 64px Inter, -apple-system, sans-serif";
    const titleText = book?.title ?? "";
    const maxTitleW = 900;
    let titleLines = 1;
    if (tctx.measureText(titleText).width > maxTitleW) {
      const words = titleText.split(" ");
      let line = "";
      for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (tctx.measureText(test).width > maxTitleW && line) { titleLines++; line = word; }
        else line = test;
      }
    }
    totalH += titleLines * 76 + 48; // title + gap
    totalH += 50; // author
    if (rating && rating > 0) totalH += 80; // stars

    // Comment lines
    let commentLines: string[] = [];
    if (comment) {
      tctx.font = "400 44px Inter, -apple-system, sans-serif";
      const maxW = W - 226;
      const words = comment.split(" ");
      let line = "";
      for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (tctx.measureText(test).width > maxW && line) { commentLines.push(line); line = word; }
        else line = test;
      }
      if (line) commentLines.push(line);
      totalH += 20 + commentLines.length * 62 + 20; // padding + lines + padding
    }

    totalH += 80; // footer
    const H = Math.max(totalH, 1200); // minimum height

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background — Solar Pop gradient (orange → magenta → sun)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#FB6538");
    bgGrad.addColorStop(0.5, "#FF3C7A");
    bgGrad.addColorStop(1, "#FFC83D");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";

    // Brand row: PLOOM • MA LECTURE
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 32px Inter, -apple-system, sans-serif";
    ctx.fillText("PLOOM  •  MA LECTURE", W / 2, 70);

    // Cover — with a soft white frame & drop shadow
    const cx = (W - cw) / 2, cy = 120;

    // Drop shadow behind cover
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(cx - 18, cy - 18, cw + 36, ch + 36, 24);
    ctx.fill();
    ctx.restore();

    if (book?.coverUrl) {
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = book.coverUrl!;
        });
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx, cy, cw, ch, 16);
        ctx.clip();
        ctx.drawImage(img, cx, cy, cw, ch);
        ctx.restore();
      } catch { /* skip */ }
    }

    // Title
    let yPos = cy + ch + 80;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 68px Inter, -apple-system, sans-serif";
    if (tctx.measureText(titleText).width > maxTitleW) {
      const words = titleText.split(" ");
      let line = "";
      for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (ctx.measureText(test).width > maxTitleW && line) {
          ctx.fillText(line, W / 2, yPos);
          line = word;
          yPos += 80;
        } else { line = test; }
      }
      ctx.fillText(line, W / 2, yPos);
    } else {
      ctx.fillText(titleText, W / 2, yPos);
    }
    yPos += 50;

    // Author
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 38px Inter, -apple-system, sans-serif";
    ctx.fillText(book?.authors.join(", ") || "Auteur inconnu", W / 2, yPos);
    yPos += 64;

    // Stars — white on gradient for contrast
    if (rating && rating > 0) {
      let sx = W / 2 - 150;
      ctx.textAlign = "left";
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < rating ? "#FFFFFF" : "rgba(255,255,255,0.35)";
        ctx.font = "62px sans-serif";
        ctx.fillText("★", sx, yPos);
        sx += 66;
      }
      ctx.textAlign = "center";
      yPos += 76;
    }

    // Review — glass card on top of the gradient
    if (comment && commentLines.length > 0) {
      const boxPadX = 80;
      const boxPadY = 28;
      const boxX = 80;
      const boxW = W - 160;
      const lineH = 62;
      const boxH = commentLines.length * lineH + boxPadY * 2;

      // Glass panel
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX, yPos - 6, boxW, boxH, 28);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Big opening quote
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "800 100px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText("“", boxX + 20, yPos + 60);

      // Draw text lines
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "500 44px Inter, -apple-system, sans-serif";
      let ty = yPos + boxPadY + 44;
      for (const l of commentLines) {
        ctx.fillText(l, boxX + boxPadX, ty);
        ty += lineH;
      }
      ctx.textAlign = "center";
      yPos += boxH + 24;
    }

    // Footer chip
    const chipW = 280, chipH = 44;
    const chipX = (W - chipW) / 2;
    const chipY = H - 70;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 999);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 22px Inter, -apple-system, sans-serif";
    ctx.fillText("MA FICHE DE LECTURE", W / 2, chipY + 30);

    return canvas.toDataURL("image/png");
  };

  const handleDownloadCard = async () => {
    if (!book) return;
    setGeneratingCard(true);
    try {
      const dataUrl = await generateShareCard();
      const link = document.createElement("a");
      link.download = `ploom-${book.isbn}.png`;
      link.href = dataUrl;
      link.click();
      toast("Image téléchargée ! Partagez-la sur Instagram", "success");
    } catch (e) {
      toast("Erreur lors de la génération", "error");
    }
    setGeneratingCard(false);
  };

  const handleShareNative = async () => {
    if (!book) return;
    const text = `📖 ${book.title} — ${book.authors.join(", ")}${rating ? `\n⭐ ${rating}/5` : ""}${comment ? `\n"${comment}"` : ""}\n\nPartagé via Ploom`;

    try {
      const dataUrl = await generateShareCard();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `ploom-${book.isbn}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${book.title} — Ma fiche de lecture`,
          text,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({ title: `${book.title} — Ma fiche de lecture`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast("Texte copié !", "success");
      }
    } catch {
      // User cancelled or error, that's fine
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !book) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast("Veuillez sélectionner une image", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("L'image doit faire moins de 5 Mo", "error");
      return;
    }

    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `covers/${isbn}.${ext}`;

      // Try upload — if bucket doesn't exist, try creating it first
      let { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(path, file, { upsert: true });

      // If bucket not found, try to create it and retry
      if (uploadError && (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket"))) {
        console.warn("Bucket book-covers not found, attempting to create...", uploadError.message);
        const { error: createError } = await supabase.storage.createBucket("book-covers", {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
        if (createError && !createError.message?.includes("already exists")) {
          console.error("Failed to create bucket:", createError);
          toast("Erreur : bucket de stockage non configuré. Voir la console.", "error");
          setUploadingCover(false);
          return;
        }
        // Retry upload
        const retry = await supabase.storage
          .from("book-covers")
          .upload(path, file, { upsert: true });
        uploadError = retry.error;
      }

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast(`Erreur upload : ${uploadError.message}`, "error");
        setUploadingCover(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("book-covers")
        .getPublicUrl(path);

      const coverUrl = urlData.publicUrl;
      const result = await updateBook.execute(isbn, { coverUrl });
      if (result.ok) {
        setBook(result.value);
        onUpdated();
        toast("Couverture mise à jour", "success");
      }
    } catch (err) {
      console.error("Cover upload exception:", err);
      toast("Erreur lors de l'upload", "error");
    }
    setUploadingCover(false);
  };

  const handleOpenShareGroup = async () => {
    hapticLight();
    setShareMessage("");
    setShareRating(rating ?? 0);
    setShareComment(comment ?? "");
    setShowShareGroup(true);
    const result = await readingGroupRepository.findMyGroups();
    if (result.ok) setMyGroups(result.value);
  };

  const handleShareToGroup = async (groupId: string) => {
    if (!book) return;
    setSharingToGroup(groupId);
    // Single call: persists book + optional review + ONE combined activity.
    const result = await readingGroupRepository.shareBook(
      groupId,
      book.isbn,
      book.title,
      book.coverUrl,
      book.comment,
      shareMessage.trim() || null,
      shareRating > 0
        ? { rating: shareRating, comment: shareComment.trim() || null }
        : null,
    );
    setSharingToGroup(null);
    if (result.ok) {
      hapticMedium();
      toast("Livre partagé dans le groupe !", "success");
      setShowShareGroup(false);
    } else {
      toast("Erreur lors du partage", "error");
    }
  };

  const handleShareLink = async () => {
    if (!book) return;
    hapticLight();
    // Deep-link opens the add-book preview with ISBN pre-filled — works for
    // recipients who have the app installed. For others the title+author
    // still gives them enough to find the book.
    const deepLink = `ploom://add-book?mode=scan&isbn=${book.isbn}`;
    const authors = book.authors.join(", ") || "Auteur inconnu";
    const text =
      `📚 ${book.title}\n${authors}\n\n` +
      `Je te le recommande sur Ploom :\n${deepLink}\n\n` +
      `Pas encore Ploom ? Télécharge l'app pour découvrir l'univers des lecteurs.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: book.title, text });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast("Lien copié dans le presse-papier", "success");
      } catch {
        toast("Impossible de copier le lien", "error");
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce livre de ta bibliothèque ?")) return;
    hapticError();
    const result = await deleteBook.execute(isbn);
    if (result.ok) onDeleted();
  };

  if (loading) {
    return <BookDetailSkeleton />;
  }

  if (!book) {
    return (
      <div className="p-4">
        <BackButton onClick={onBack} />
        <p className="text-status-error">Livre introuvable</p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4">
      <BackButton onClick={onBack} />

      <div className="flex flex-col items-center mb-4 sm:mb-6">
        {book.coverUrl ? (
          <button
            onClick={() => setShowLightbox(true)}
            className="relative group active:scale-95 transition-transform"
          >
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-28 h-40 min-[360px]:w-36 min-[360px]:h-52 sm:w-40 sm:h-60 object-cover rounded-card shadow-hero mb-3 sm:mb-4"
            />
            {isRead && <ReadBadge />}
            <div className="absolute inset-0 mb-3 sm:mb-4 rounded-card bg-black/0 group-active:bg-black/10 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-active:opacity-80 transition-opacity drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            </div>
          </button>
        ) : (
          <div className="w-28 h-40 min-[360px]:w-36 min-[360px]:h-52 sm:w-40 sm:h-60 bg-surface-subtle rounded-card flex items-center justify-center text-text-muted text-sm mb-3 sm:mb-4">
            Pas de couverture
          </div>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-center text-text-primary px-2">{book.title}</h1>

        {/* Wishlist toggle */}
        <button
          onClick={handleToggleWishlist}
          className="mt-2 flex items-center gap-1.5 text-sm font-medium transition-all active:scale-90"
        >
          <svg
            className={`w-5 h-5 transition-colors ${isWishlist ? "text-status-error" : "text-text-muted"}`}
            fill={isWishlist ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className={isWishlist ? "text-status-error" : "text-text-tertiary"}>
            {isWishlist ? "Dans ma wishlist" : "Ajouter aux souhaits"}
          </span>
        </button>

        {/* Cover photo upload */}
        <label className="mt-2 flex items-center gap-1.5 text-sm text-brand-grape font-medium cursor-pointer active:opacity-60 transition-opacity">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {uploadingCover ? "Upload..." : book.coverUrl ? "Changer la couverture" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCoverUpload}
            className="hidden"
            disabled={uploadingCover}
          />
        </label>

        {/* Swipe to mark as read */}
        <div className="w-full mt-4">
          <SwipeToRead isRead={isRead} onChange={handleToggleRead} />
        </div>
      </div>

      {/* Cover lightbox */}
      {showLightbox && book.coverUrl && (
        <CoverLightbox
          imageUrl={book.coverUrl}
          alt={book.title}
          onClose={() => setShowLightbox(false)}
        />
      )}

      {editing ? (
        <EditForm
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          coverInput={coverInput}
          setCoverInput={setCoverInput}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            initForm(book);
            setEditing(false);
          }}
        />
      ) : (
        <>
        {description && (
          <div className="card mb-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Résumé</h3>
            <p
              className={
                "text-sm text-text-secondary leading-relaxed " +
                (descriptionExpanded ? "" : "line-clamp-6")
              }
            >
              {description}
            </p>
            {description.length > 320 && (
              <button
                onClick={() => setDescriptionExpanded((v) => !v)}
                className="mt-2 text-[13px] font-semibold text-brand-grape active:opacity-70"
              >
                {descriptionExpanded ? "Voir moins" : "Voir plus"}
              </button>
            )}
          </div>
        )}
        <div className="card space-y-3">
          <InfoRow label="ISBN" value={book.isbn} />
          <InfoRow label="Auteur(s)" value={book.authors.join(", ") || "Inconnu"} />
          <InfoRow label="Éditeur" value={book.publisher} />
          <InfoRow label="Date de parution" value={book.publishedDate || "Inconnue"} />
          <InfoRow
            label="Prix neuf"
            value={book.retailPrice ? book.retailPrice.format() : "Non renseigné"}
          />

          {/* Category selector */}
          <div>
            <p className="text-text-tertiary text-xs uppercase tracking-wide mb-1">Catégorie</p>
            <select
              value={categoryId ?? ""}
              onChange={(e) => handleCategoryChange(e.target.value || null)}
              disabled={savingCategory}
              className="input-rect w-full"
            >
              <option value="">Non classé</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setEditing(true)}
            className="w-full py-2.5 rounded-pill bg-brand-grape/10 text-brand-grape font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Modifier
          </button>
        </div>
        </>
      )}

      {/* Rating & Comment */}
      {!editing && (
        <div className="card mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Ma fiche de lecture</h3>
          <div className="flex gap-0">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                className="p-1.5 transition-transform active:scale-90"
              >
                <svg
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${star <= (rating ?? 0) ? "text-brand-lemon" : "text-border-strong"}`}
                  fill={star <= (rating ?? 0) ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Mon ressenti, ce que j'en retiens..."
            rows={2}
            className="input-rect w-full resize-none"
          />
          <button
            onClick={handleSaveReview}
            disabled={savingReview}
            className="w-full py-2.5 rounded-pill bg-brand-grape/10 text-brand-grape font-semibold transition-all duration-200 active:scale-95"
          >
            {savingReview ? "..." : "Enregistrer ma fiche"}
          </button>
        </div>
      )}

      {/* Share actions */}
      {!editing && (
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleOpenShareGroup}
              className="flex items-center gap-3 p-3 rounded-2xl text-left border transition-transform active:scale-[0.98]"
              style={{ background: "#FFF3E4", borderColor: "rgba(255,139,95,0.3)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-[22px]">
                👥
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text-primary">Partager dans un groupe</p>
                <p className="text-xs text-text-tertiary mt-0.5">Recommander à mes groupes de lecture</p>
              </div>
              <span className="text-xl text-text-muted">›</span>
            </button>

            <button
              onClick={handleShareLink}
              className="flex items-center gap-3 p-3 rounded-2xl text-left border transition-transform active:scale-[0.98]"
              style={{ background: "#FFF8DC", borderColor: "rgba(255,200,61,0.45)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-[22px]">
                🔗
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text-primary">Partager via un lien</p>
                <p className="text-xs text-text-tertiary mt-0.5">Message, WhatsApp, Mail...</p>
              </div>
              <span className="text-xl text-text-muted">›</span>
            </button>

            <button
              onClick={() => setShowSocialShare(true)}
              className="flex items-center gap-3 p-3 rounded-2xl text-left border transition-transform active:scale-[0.98]"
              style={{ background: "#F5EADE", borderColor: "rgba(255,60,122,0.2)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-[22px]">
                📸
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text-primary">Partager ma fiche</p>
                <p className="text-xs text-text-tertiary mt-0.5">Image à poster sur les réseaux</p>
              </div>
              <span className="text-xl text-text-muted">›</span>
            </button>
          </div>
        </div>
      )}

      {/* Buy button — all books */}
      {!editing && (
        <div className="relative mt-4">
          <button
            onClick={() => setShowBuyPicker(!showBuyPicker)}
            className="w-full py-3 rounded-card bg-white shadow-card font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm text-brand-grape border border-border hover:shadow-float"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Acheter ce livre
          </button>
          {showBuyPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-float border border-border overflow-hidden z-10 animate-fadeIn">
              <a
                href={`https://www.amazon.fr/s?k=${encodeURIComponent(book.title)}&tag=shelfy-21`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowBuyPicker(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-subtle transition-colors"
              >
                <span className="text-xl">🛒</span>
                <p className="font-semibold text-sm text-text-primary flex-1">Amazon</p>
              </a>
              <a
                href={`https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(book.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowBuyPicker(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-subtle transition-colors border-t border-border-light"
              >
                <span className="text-xl">📦</span>
                <p className="font-semibold text-sm text-text-primary flex-1">Fnac</p>
              </a>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleDelete}
        className="w-full mt-4 py-3 text-status-error font-medium transition-all duration-200 active:scale-95 text-sm"
      >
        Supprimer ce livre
      </button>

      {/* Share to group bottom sheet */}
      <BottomSheet isOpen={showShareGroup} onClose={() => setShowShareGroup(false)} title="Partager dans un groupe">
        <div className="pb-4 space-y-3">
          {/* Message input */}
          <div>
            <label className="text-sm text-text-secondary block mb-1 font-medium">
              Message (optionnel)
            </label>
            <input
              type="text"
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Essayez-le, il est trop bien !"
              className="input-field"
              maxLength={200}
            />
          </div>

          {/* Review for group */}
          <div>
            <label className="text-xs text-text-secondary block mb-1 font-medium">
              Ma fiche de lecture (visible dans le groupe)
            </label>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setShareRating(shareRating === star ? 0 : star)}
                  className="transition-transform active:scale-90"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={star <= shareRating ? "#FBBF24" : "none"} stroke={star <= shareRating ? "#FBBF24" : "currentColor"} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
              ))}
            </div>
            {shareRating > 0 && (
              <input
                type="text"
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                placeholder="Commentaire (optionnel)"
                className="input-field"
                maxLength={300}
              />
            )}
          </div>

          <div className="border-t border-border-light my-2" />

          {myGroups.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              Vous n'êtes dans aucun groupe. Créez-en un depuis l'onglet Groupes !
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-text-muted mb-1">Choisissez un groupe :</p>
              {myGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleShareToGroup(g.id)}
                  disabled={sharingToGroup !== null}
                  className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-surface-subtle active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-xl flex-shrink-0">
                    {g.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{g.name}</p>
                    {g.description && (
                      <p className="text-text-tertiary text-xs truncate">{g.description}</p>
                    )}
                  </div>
                  {sharingToGroup === g.id ? (
                    <div className="w-5 h-5 border-2 border-brand-grape border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-brand-grape flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Social share bottom sheet */}
      <BottomSheet isOpen={showSocialShare} onClose={() => setShowSocialShare(false)} title="Partager ma fiche de lecture">
        <div className="pb-4 space-y-2">
          {/* Download for Instagram */}
          <button
            onClick={async () => {
              await handleDownloadCard();
              setShowSocialShare(false);
            }}
            disabled={generatingCard}
            className="flex items-center gap-3 w-full py-3 px-3 rounded-xl hover:bg-surface-subtle active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center text-white text-lg flex-shrink-0">
              📸
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary text-sm">Télécharger l'image</p>
              <p className="text-text-tertiary text-xs">Format story pour Instagram, Snapchat...</p>
            </div>
            {generatingCard && (
              <div className="w-5 h-5 border-2 border-brand-grape border-t-transparent rounded-full animate-spin" />
            )}
          </button>

          {/* Native share with image */}
          <button
            onClick={async () => {
              setShowSocialShare(false);
              await handleShareNative();
            }}
            className="flex items-center gap-3 w-full py-3 px-3 rounded-xl hover:bg-surface-subtle active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-grape/10 flex items-center justify-center text-brand-grape text-lg flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary text-sm">Partager</p>
              <p className="text-text-tertiary text-xs">Envoyer l'image + texte via le menu de partage</p>
            </div>
          </button>

          {/* Copy text */}
          <button
            onClick={() => {
              const text = `📖 ${book.title} — ${book.authors.join(", ")}${rating ? `\n⭐ ${rating}/5` : ""}${comment ? `\n"${comment}"` : ""}\n\nPartagé via Ploom`;
              navigator.clipboard.writeText(text);
              toast("Texte copié !", "success");
              setShowSocialShare(false);
            }}
            className="flex items-center gap-3 w-full py-3 px-3 rounded-xl hover:bg-surface-subtle active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-text-secondary text-lg flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary text-sm">Copier le texte</p>
              <p className="text-text-tertiary text-xs">Coller dans n'importe quelle app</p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-brand-grape font-medium mb-3 sm:mb-4 flex items-center gap-1 min-h-[44px]">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Retour
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-tertiary text-xs uppercase tracking-wide">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function EditForm({
  priceInput,
  setPriceInput,
  coverInput,
  setCoverInput,
  saving,
  onSave,
  onCancel,
}: {
  priceInput: string;
  setPriceInput: (v: string) => void;
  coverInput: string;
  setCoverInput: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="card space-y-3">
      <div>
        <label className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Prix neuf (€)</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="12.50"
          className="input-rect w-full"
        />
      </div>
      <div>
        <label className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">URL couverture</label>
        <input
          type="url"
          value={coverInput}
          onChange={(e) => setCoverInput(e.target.value)}
          placeholder="https://..."
          className="input-rect w-full"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1" disabled={saving}>
          Annuler
        </button>
        <button onClick={onSave} className="btn-primary flex-1" disabled={saving}>
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
