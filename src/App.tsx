import { useState, useCallback } from "react";
import { Scanner } from "@interfaces/components/Scanner";
import { Library } from "@interfaces/components/Library";
import { SeriesDetail } from "@interfaces/components/SeriesDetail";
import { BookDetail } from "@interfaces/components/BookDetail";
import { BottomNav } from "@interfaces/components/BottomNav";

type Tab = "scanner" | "library";

type View =
  | { screen: "main" }
  | { screen: "series"; name: string }
  | { screen: "book"; isbn: string; seriesName: string };

export default function App() {
  const [tab, setTab] = useState<Tab>("scanner");
  const [view, setView] = useState<View>({ screen: "main" });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setView({ screen: "main" });
  };

  return (
    <div className="min-h-screen pb-20 max-w-lg mx-auto">
      {tab === "scanner" && (
        <Scanner onBookAdded={refresh} />
      )}

      {tab === "library" && view.screen === "main" && (
        <Library
          refreshKey={refreshKey}
          onSelectSeries={(name) => setView({ screen: "series", name })}
        />
      )}

      {tab === "library" && view.screen === "series" && (
        <SeriesDetail
          seriesName={view.name}
          refreshKey={refreshKey}
          onBack={() => setView({ screen: "main" })}
          onSelectBook={(isbn) =>
            setView({ screen: "book", isbn, seriesName: view.name })
          }
        />
      )}

      {tab === "library" && view.screen === "book" && (
        <BookDetail
          isbn={view.isbn}
          onBack={() => setView({ screen: "series", name: view.seriesName })}
          onDeleted={() => {
            refresh();
            setView({ screen: "series", name: view.seriesName });
          }}
          onUpdated={refresh}
        />
      )}

      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  );
}
